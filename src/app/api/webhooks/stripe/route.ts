import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabase } from "@/lib/supabase";
import type Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const PLAN_LIMITS: Record<string, { rate_limit_rpm: number }> = {
  free: { rate_limit_rpm: 60 },
  pro: { rate_limit_rpm: 300 },
  scale: { rate_limit_rpm: 1000 },
};

/** Plan for a monthly price, or null for a price we don't recognise. */
function planFromAmount(amountCents: number): string | null {
  if (amountCents === 2900) return "pro";
  if (amountCents === 9900) return "scale";
  return null;
}

type DbResult = { data?: unknown; error: { message?: string } | null };

/**
 * Supabase reports failures in the result instead of throwing. Throwing here
 * makes the webhook answer 500, so Stripe retries the event instead of
 * treating a subscription we never recorded as delivered.
 */
function check<T extends DbResult>(result: T, what: string): T {
  if (result.error) throw new Error(`${what} failed: ${result.error.message ?? "unknown error"}`);
  return result;
}

function unixToIso(value: unknown): string | null {
  return typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: true, message: "Stripe not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: true, message: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // Fail closed: without the signing secret any caller could post a forged
  // checkout.session.completed and upgrade an account's plan for free.
  if (!WEBHOOK_SECRET) {
    console.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: true, message: "Stripe webhook signing secret not configured" },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: true, message: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const sb = getSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const plan = (session.metadata?.plan as string) || "pro";
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

        const customerEmail = session.customer_details?.email;
        const subscriptionFields = {
          subscription_id: subscriptionId,
          subscription_plan: plan,
          subscription_status: "active",
          rate_limit_rpm: limits.rate_limit_rpm,
        };

        // Our checkout route puts the consumer's id in the session metadata,
        // and the event is signed, so that is the most reliable match.
        const metadataConsumerId = session.metadata?.consumer_id;
        if (metadataConsumerId) {
          const { data: updated } = check(
            await sb
              .from("bazaar_consumers")
              .update({ ...subscriptionFields, ...(customerId ? { stripe_customer_id: customerId } : {}) })
              .eq("id", metadataConsumerId)
              .select("id"),
            "subscription update by consumer id"
          );
          if (Array.isArray(updated) && updated.length > 0) break;
        }

        if (customerId) {
          const { data: existing } = check(
            await sb
              .from("bazaar_consumers")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .limit(1),
            "consumer lookup by Stripe customer"
          );

          if (Array.isArray(existing) && existing.length > 0) {
            check(
              await sb.from("bazaar_consumers").update(subscriptionFields).eq("stripe_customer_id", customerId),
              "subscription update by Stripe customer"
            );
            break;
          }
          if (customerEmail) {
            // Fall back to email, but only when exactly one account has it:
            // one payment must not upgrade several accounts.
            const { data: byEmail } = check(
              await sb.from("bazaar_consumers").select("id").eq("email", customerEmail).limit(2),
              "consumer lookup by email"
            );
            if (Array.isArray(byEmail) && byEmail.length === 1) {
              check(
                await sb
                  .from("bazaar_consumers")
                  .update({ ...subscriptionFields, stripe_customer_id: customerId })
                  .eq("id", (byEmail[0] as { id: string }).id),
                "subscription update by email"
              );
              break;
            }
          }
        }
        console.error(
          `Stripe webhook: checkout ${session.id} paid for subscription ${subscriptionId} but matched no single consumer; reconcile manually`
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const item = subscription.items.data[0];
        const amountCents = item?.price?.unit_amount || 0;
        // An unrecognised price (a new or annual price, a coupon-adjusted
        // amount) must not silently downgrade a paying customer to free.
        const plan = planFromAmount(amountCents);
        if (!plan) {
          console.error(
            `Stripe webhook: subscription ${subscriptionId} has unrecognised price ${amountCents}; plan left unchanged`
          );
        }
        const limits = (plan && PLAN_LIMITS[plan]) || null;
        // Since API version 2025-03-31 (we pin 2026-01-28), current_period_end
        // lives on the subscription item; older versions put it on the subscription.
        const subAny = subscription as unknown as Record<string, unknown>;
        const itemAny = (item ?? {}) as unknown as Record<string, unknown>;
        const periodEnd = unixToIso(itemAny.current_period_end) ?? unixToIso(subAny.current_period_end);
        const cancelledAt = unixToIso(subAny.canceled_at);

        const update: Record<string, unknown> = {
          subscription_status: status,
          subscription_current_period_end: periodEnd,
          subscription_cancelled_at: cancelledAt,
        };
        if (status !== "active") {
          update.rate_limit_rpm = PLAN_LIMITS.free.rate_limit_rpm;
        } else if (limits) {
          update.rate_limit_rpm = limits.rate_limit_rpm;
        }
        if (plan) update.subscription_plan = plan;

        check(
          await sb.from("bazaar_consumers").update(update).eq("subscription_id", subscriptionId),
          "subscription status update"
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        check(
          await sb
            .from("bazaar_consumers")
            .update({
              subscription_plan: "free",
              subscription_status: "cancelled",
              subscription_cancelled_at: new Date().toISOString(),
              rate_limit_rpm: PLAN_LIMITS.free.rate_limit_rpm,
            })
            .eq("subscription_id", subscriptionId),
          "subscription cancellation"
        );
        break;
      }

      default:
        // Unhandled event type — acknowledge it
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error(`Stripe webhook error (${event.type} ${event.id}): ${message}`);
    // 500 makes Stripe retry. Database details stay in the log.
    return NextResponse.json(
      { error: true, message: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
