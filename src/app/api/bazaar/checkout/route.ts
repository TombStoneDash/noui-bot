import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

const PLANS: Record<
  string,
  { name: string; priceAmountCents: number; callsPerMonth: number; feeRate: string }
> = {
  builder: {
    name: "Agent Bazaar — Builder",
    priceAmountCents: 2900,
    callsPerMonth: 1000,
    feeRate: "12%",
  },
  scale: {
    name: "Agent Bazaar — Scale",
    priceAmountCents: 9900,
    callsPerMonth: 10000,
    feeRate: "8%",
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
      { error: true, message: "Invalid plan. Use 'builder' or 'scale'." },
      { status: 400 }
    );
  }

  const { name, priceAmountCents } = PLANS[plan];

  try {
    const session = await stripe.checkout.sessions.create({
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
      metadata: { plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: true, message }, { status: 500 });
  }
}
