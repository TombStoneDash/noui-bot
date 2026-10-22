import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_PRO_PRICE_ID } from "@/lib/stripe";
import { authenticateKey as authenticateRequest, type KeyOwner } from "@/lib/bazaar-auth";
import { getSupabase } from "@/lib/supabase";
import { PLANS as PLAN_DEFS } from "@/lib/subscription";

const PLANS: Record<
  string,
  { name: string; priceAmountCents: number; callsPerMonth: number; feeRate: string; stripePriceId?: string }
> = {
  pro: {
    name: "noui.bot — Pro",
    priceAmountCents: PLAN_DEFS.pro.priceCents,
    callsPerMonth: PLAN_DEFS.pro.callsPerMonth,
    feeRate: PLAN_DEFS.pro.feeRate,
    stripePriceId: STRIPE_PRO_PRICE_ID || undefined,
  },
  scale: {
    name: "noui.bot — Scale",
    priceAmountCents: PLAN_DEFS.scale.priceCents,
    callsPerMonth: PLAN_DEFS.scale.callsPerMonth,
    feeRate: PLAN_DEFS.scale.feeRate,
  },
};

/**
 * Return the consumer's Stripe customer, creating it at most once.
 * The idempotency key makes concurrent first checkouts share one customer,
 * and the conditional update never replaces a customer that is already linked.
 */
async function ensureStripeCustomer(stripe: Stripe, consumer: KeyOwner): Promise<string> {
  const sb = getSupabase();
  const { data: row } = await sb
    .from("bazaar_consumers")
    .select("stripe_customer_id")
    .eq("id", consumer.id)
    .single();
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const customer = await stripe.customers.create(
    {
      email: consumer.email,
      name: consumer.name,
      metadata: { bazaar_consumer_id: consumer.id },
    },
    { idempotencyKey: `bazaar-consumer-customer-${consumer.id}` }
  );

  const { data: linked } = await sb
    .from("bazaar_consumers")
    .update({ stripe_customer_id: customer.id })
    .eq("id", consumer.id)
    .is("stripe_customer_id", null)
    .select("stripe_customer_id");
  if (linked && linked.length > 0) return customer.id;

  // Another request linked a customer first; use that one.
  const { data: winner } = await sb
    .from("bazaar_consumers")
    .select("stripe_customer_id")
    .eq("id", consumer.id)
    .single();
  return winner?.stripe_customer_id || customer.id;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: true, message: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const plan = body && typeof body === "object" ? (body as { plan?: unknown }).plan : undefined;

  // Own keys only: "toString" or "__proto__" must not resolve to a plan.
  if (typeof plan !== "string" || !Object.prototype.hasOwnProperty.call(PLANS, plan)) {
    return NextResponse.json(
      { error: true, message: "Invalid plan. Use 'pro' or 'scale'." },
      { status: 400 }
    );
  }

  const { name, priceAmountCents, stripePriceId } = PLANS[plan];

  // If authenticated as a consumer, link checkout to that consumer.
  // Provider keys must not be recorded as a consumer_id.
  const auth = await authenticateRequest(request);
  const consumer = auth && auth.type === "consumer" ? auth : null;
  let customerId: string | undefined;
  let customerEmail: string | undefined;

  try {
    if (consumer) {
      customerEmail = consumer.email;
      customerId = await ensureStripeCustomer(stripe, consumer);
    }

    // Use Stripe Price ID if configured, otherwise fall back to inline price_data
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = stripePriceId
      ? { price: stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: { name },
            unit_amount: priceAmountCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [lineItem],
      success_url: `${new URL(request.url).origin}/developers/dashboard?checkout=success`,
      cancel_url: `${new URL(request.url).origin}/pricing?checkout=cancelled`,
      metadata: { plan, ...(consumer ? { consumer_id: consumer.id } : {}) },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[checkout] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: true, message: "Checkout failed" }, { status: 502 });
  }
}
