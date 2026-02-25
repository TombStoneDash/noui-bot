import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { getStripe, PLATFORM_FEE_RATE } from "@/lib/stripe";

/**
 * POST /api/bazaar/payouts — Trigger payout to provider's Stripe Connect account
 * 
 * Requires: provider earnings > $10 (1000 cents)
 * If Stripe is configured: creates a Stripe Transfer
 * If not: dry-run mode, logs what WOULD happen
 */
export async function POST(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required" },
      { status: 401 }
    );
  }

  const sb = getSupabase();
  const MINIMUM_PAYOUT_CENTS = 1000; // $10 minimum

  // Get provider's payout balance
  const { data: provider } = await sb
    .from("bazaar_providers")
    .select("payout_balance_cents, stripe_account_id")
    .eq("id", owner.id)
    .single();

  const payoutBalance = provider?.payout_balance_cents ?? 0;

  if (payoutBalance < MINIMUM_PAYOUT_CENTS) {
    return NextResponse.json(
      {
        error: true,
        code: "BELOW_MINIMUM",
        message: `Minimum payout is $${(MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}. Current balance: $${(payoutBalance / 100).toFixed(2)}`,
        payout_balance_cents: payoutBalance,
        minimum_cents: MINIMUM_PAYOUT_CENTS,
      },
      { status: 422 }
    );
  }

  const stripe = getStripe();

  if (stripe && provider?.stripe_account_id) {
    // Live mode: create Stripe Transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: payoutBalance,
        currency: "usd",
        destination: provider.stripe_account_id,
        metadata: {
          bazaar_provider_id: owner.id,
          provider_name: owner.name,
        },
      });

      // Record payout
      await sb.from("bazaar_payouts").insert({
        provider_id: owner.id,
        gross_amount_cents: Math.round(payoutBalance / (1 - PLATFORM_FEE_RATE)),
        platform_fee_cents: Math.round(payoutBalance / (1 - PLATFORM_FEE_RATE)) - payoutBalance,
        net_payout_cents: payoutBalance,
        stripe_transfer_id: transfer.id,
        status: "paid",
        paid_at: new Date().toISOString(),
      });

      // Reset payout balance
      await sb
        .from("bazaar_providers")
        .update({ payout_balance_cents: 0, updated_at: new Date().toISOString() })
        .eq("id", owner.id);

      return NextResponse.json({
        mode: "live",
        payout_cents: payoutBalance,
        payout: `$${(payoutBalance / 100).toFixed(2)}`,
        stripe_transfer_id: transfer.id,
        message: "Payout initiated. Funds will arrive in your connected bank account in 2-7 business days.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown Stripe error";
      return NextResponse.json(
        { error: true, code: "STRIPE_ERROR", message },
        { status: 500 }
      );
    }
  }

  // Dry-run mode
  return NextResponse.json({
    mode: "dry_run",
    would_payout_cents: payoutBalance,
    would_payout: `$${(payoutBalance / 100).toFixed(2)}`,
    stripe_connected: !!provider?.stripe_account_id,
    stripe_configured: !!stripe,
    message: "Payout simulated (dry-run mode).",
    requirements: {
      ...(! stripe ? { stripe_keys: "Set STRIPE_SECRET_KEY in environment" } : {}),
      ...(!provider?.stripe_account_id ? { connect: "Complete Stripe Connect onboarding first (POST /api/bazaar/connect)" } : {}),
    },
  });
}

/**
 * GET /api/bazaar/payouts — Check payout history and pending balance
 */
export async function GET(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required" },
      { status: 401 }
    );
  }

  const sb = getSupabase();

  const { data: provider } = await sb
    .from("bazaar_providers")
    .select("payout_balance_cents, stripe_account_id")
    .eq("id", owner.id)
    .single();

  const { data: payouts } = await sb
    .from("bazaar_payouts")
    .select("*")
    .eq("provider_id", owner.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    provider_id: owner.id,
    pending_balance_cents: provider?.payout_balance_cents ?? 0,
    pending_balance: `$${((provider?.payout_balance_cents ?? 0) / 100).toFixed(2)}`,
    stripe_connected: !!provider?.stripe_account_id,
    minimum_payout: "$10.00",
    history: (payouts || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      amount_cents: p.net_payout_cents,
      status: p.status,
      paid_at: p.paid_at,
      stripe_transfer_id: p.stripe_transfer_id,
    })),
  });
}
