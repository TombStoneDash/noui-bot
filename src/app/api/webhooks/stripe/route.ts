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

function planFromAmount(amountCents: number): string {
  if (amountCents === 2900) return "pro";
  if (amountCents === 9900) return "scale";
  return "free";
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

  let event: Stripe.Event;
  try {
    if (WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } else {
      // Dev mode — parse without verification
      event = JSON.parse(body) as Stripe.Event;
    }
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

        // Find consumer by stripe_customer_id or update by email
        const customerEmail = session.customer_details?.email;

        if (customerId) {
          // Try by stripe_customer_id first
          const { data: existing } = await sb
            .from("bazaar_consumers")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .limit(1);

          if (existing && existing.length > 0) {
            await sb
              .from("bazaar_consumers")
              .update({
                subscription_id: subscriptionId,
                subscription_plan: plan,
                subscription_status: "active",
                rate_limit_rpm: limits.rate_limit_rpm,
              })
              .eq("stripe_customer_id", customerId);
          } else if (customerEmail) {
            // Fall back to email match
            await sb
              .from("bazaar_consumers")
              .update({
                stripe_customer_id: customerId,
                subscription_id: subscriptionId,
                subscription_plan: plan,
                subscription_status: "active",
                rate_limit_rpm: limits.rate_limit_rpm,
              })
              .eq("email", customerEmail);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const amountCents = subscription.items.data[0]?.price?.unit_amount || 0;
        const plan = planFromAmount(amountCents);
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
        // Cast to access fields that may vary across Stripe API versions
        const subAny = subscription as unknown as Record<string, unknown>;
        const periodEndRaw = subAny.current_period_end as number | undefined;
        const periodEnd = periodEndRaw
          ? new Date(periodEndRaw * 1000).toISOString()
          : null;
        const canceledAtRaw = subAny.canceled_at as number | undefined;
        const cancelledAt = canceledAtRaw
          ? new Date(canceledAtRaw * 1000).toISOString()
          : null;

        await sb
          .from("bazaar_consumers")
          .update({
            subscription_plan: plan,
            subscription_status: status === "active" ? "active" : status === "past_due" ? "past_due" : status,
            subscription_current_period_end: periodEnd,
            subscription_cancelled_at: cancelledAt,
            rate_limit_rpm: status === "active" ? limits.rate_limit_rpm : PLAN_LIMITS.free.rate_limit_rpm,
          })
          .eq("subscription_id", subscriptionId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        await sb
          .from("bazaar_consumers")
          .update({
            subscription_plan: "free",
            subscription_status: "cancelled",
            subscription_cancelled_at: new Date().toISOString(),
            rate_limit_rpm: PLAN_LIMITS.free.rate_limit_rpm,
          })
          .eq("subscription_id", subscriptionId);
        break;
      }

      default:
        // Unhandled event type — acknowledge it
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error(`Stripe webhook error: ${message}`);
    return NextResponse.json(
      { error: true, message },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
