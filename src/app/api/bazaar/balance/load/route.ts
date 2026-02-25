import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/bazaar/balance/load — Add funds to consumer account
 * 
 * If Stripe is configured: creates a Checkout session for payment
 * If not configured: operates in dry-run mode (simulates balance add)
 */
export async function POST(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "consumer") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid consumer API key required" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const amountCents = body.amount_cents as number;
  if (!amountCents || amountCents < 100 || amountCents > 100000) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "amount_cents must be between 100 ($1) and 100000 ($1000)" },
      { status: 422 }
    );
  }

  const stripe = getStripe();
  const sb = getSupabase();

  if (stripe) {
    // Live mode: create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Bazaar Credits",
            description: `Add $${(amountCents / 100).toFixed(2)} to your Bazaar balance`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata: {
        consumer_id: owner.id,
        amount_cents: String(amountCents),
        type: "balance_load",
      },
      success_url: `https://noui.bot/developers/dashboard?funded=true&amount=${amountCents}`,
      cancel_url: `https://noui.bot/developers/dashboard?funded=false`,
    });

    return NextResponse.json({
      mode: "live",
      checkout_url: session.url,
      session_id: session.id,
      amount_cents: amountCents,
      amount: `$${(amountCents / 100).toFixed(2)}`,
      message: "Complete payment at the checkout URL to fund your balance.",
    });
  }

  // Dry-run mode: simulate balance addition
  const currentBalance = owner.balance_cents ?? 0;
  const newBalance = currentBalance + amountCents;

  await sb
    .from("bazaar_consumers")
    .update({
      balance_cents: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", owner.id);

  // Log the transaction (table may not exist yet — ignore errors)
  try {
    await sb.from("bazaar_transactions").insert({
      consumer_id: owner.id,
      type: "balance_load",
      amount_cents: amountCents,
      balance_after_cents: newBalance,
      source: "dry_run",
      metadata: { dry_run: true, note: "Stripe not configured — simulated balance load" },
    });
  } catch {
    // Transaction table may not exist — that's OK
  }

  return NextResponse.json({
    mode: "dry_run",
    previous_balance_cents: currentBalance,
    added_cents: amountCents,
    new_balance_cents: newBalance,
    new_balance: `$${(newBalance / 100).toFixed(2)}`,
    message: "Balance loaded (dry-run mode — Stripe not yet configured).",
    note: "In production, this would redirect to Stripe Checkout.",
  });
}
