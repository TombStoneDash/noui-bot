import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/bazaar/balance/load — Add funds to consumer account
 * 
 * If Stripe is configured: creates a Checkout session for payment.
 * If not configured: refuses with 503, unless simulated top-ups are explicitly
 * enabled with BAZAAR_DRY_RUN_TOPUPS=true outside Vercel production. A missing
 * Stripe key must never turn this endpoint into free credit.
 */
function dryRunTopupsEnabled(): boolean {
  return process.env.BAZAAR_DRY_RUN_TOPUPS === "true" && process.env.VERCEL_ENV !== "production";
}

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

  const amountCents = body?.amount_cents;
  if (typeof amountCents !== "number" || !Number.isInteger(amountCents) || amountCents < 100 || amountCents > 100000) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "amount_cents must be an integer between 100 ($1) and 100000 ($1000)" },
      { status: 422 }
    );
  }

  const stripe = getStripe();
  const sb = getSupabase();

  if (stripe) {
    // Live mode: create Stripe Checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
    } catch (error) {
      console.error("[BALANCE_LOAD] Stripe checkout failed:", error);
      return NextResponse.json(
        { error: true, code: "PAYMENT_PROVIDER_ERROR", message: "Could not start checkout. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      mode: "live",
      checkout_url: session.url,
      session_id: session.id,
      amount_cents: amountCents,
      amount: `$${(amountCents / 100).toFixed(2)}`,
      message: "Complete payment at the checkout URL to fund your balance.",
    });
  }

  if (!dryRunTopupsEnabled()) {
    return NextResponse.json(
      { error: true, code: "PAYMENTS_UNAVAILABLE", message: "Balance top-ups are temporarily unavailable." },
      { status: 503 }
    );
  }

  // Dry-run mode: simulate balance addition
  const currentBalance = owner.balance_cents ?? 0;
  const newBalance = currentBalance + amountCents;

  // Compare-and-swap on the balance read during authentication, so a concurrent
  // top-up or proxy charge is not silently overwritten.
  const { data: updated, error: updateErr } = await sb
    .from("bazaar_consumers")
    .update({
      balance_cents: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", owner.id)
    .eq("balance_cents", currentBalance)
    .select("balance_cents");

  if (updateErr) {
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: "Balance could not be updated" },
      { status: 500 }
    );
  }

  if (!Array.isArray(updated) || updated.length === 0) {
    return NextResponse.json(
      { error: true, code: "CONFLICT", message: "Balance changed while processing. Retry the top-up." },
      { status: 409 }
    );
  }

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
