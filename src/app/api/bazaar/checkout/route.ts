import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { authenticateRequest } from "@/lib/bazaar-auth";
import { getSupabase } from "@/lib/supabase";

const PLANS: Record<
  string,
  { name: string; priceAmountCents: number; callsPerMonth: number; feeRate: string }
> = {
  pro: {
    name: "Agent Bazaar — Pro",
    priceAmountCents: 2900,
    callsPerMonth: 10_000,
    feeRate: "8%",
  },
  scale: {
    name: "Agent Bazaar — Scale",
    priceAmountCents: 9900,
    callsPerMonth: 100_000,
    feeRate: "5%",
  },
};

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: true, message: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const plan = body.plan as string;

  if (!plan || !PLANS[plan]) {
    return NextResponse.json(
      { error: true, message: "Invalid plan. Use 'pro' or 'scale'." },
      { status: 400 }
    );
  }

  const { name, priceAmountCents } = PLANS[plan];

  // If authenticated, link checkout to existing consumer
  const auth = await authenticateRequest(request);
  let customerId: string | undefined;
  let customerEmail: string | undefined;

  if (auth && auth.type === "consumer") {
    customerEmail = auth.email;
    const sb = getSupabase();
    const { data: consumer } = await sb
      .from("bazaar_consumers")
      .select("stripe_customer_id")
      .eq("id", auth.id)
      .single();

    if (consumer?.stripe_customer_id) {
      customerId = consumer.stripe_customer_id;
    } else {
      // Create Stripe customer and link to consumer
      const customer = await stripe.customers.create({
        email: auth.email,
        name: auth.name,
        metadata: { bazaar_consumer_id: auth.id },
      });
      customerId = customer.id;

      await sb
        .from("bazaar_consumers")
        .update({ stripe_customer_id: customer.id })
        .eq("id", auth.id);
    }
  }

  try {
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name },
            unit_amount: priceAmountCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${new URL(request.url).origin}/developers/dashboard?checkout=success`,
      cancel_url: `${new URL(request.url).origin}/pricing?checkout=cancelled`,
      metadata: { plan, ...(auth ? { consumer_id: auth.id } : {}) },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
