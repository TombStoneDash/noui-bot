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

  // Get provider's payout balance. A failed read must not look like a $0
  // balance (or, worse, a stale one), so stop here.
  const { data: provider, error: providerErr } = await sb
    .from("bazaar_providers")
    .select("payout_balance_cents, stripe_account_id, created_at")
    .eq("id", owner.id)
    .single();

  if (providerErr || !provider) {
    return NextResponse.json(
      { error: true, code: "PAYOUT_FAILED", message: "Could not read payout balance" },
      { status: 500 }
    );
  }

  const payoutBalance = provider.payout_balance_cents ?? 0;

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

  if (stripe && provider.stripe_account_id) {
    // Claim the balance before moving money. The update only matches while the
    // balance is still the value read above, so a concurrent payout request
    // (or a retry) cannot transfer the same earnings twice.
    const { data: claimed, error: claimErr } = await sb
      .from("bazaar_providers")
      .update({ payout_balance_cents: 0, updated_at: new Date().toISOString() })
      .eq("id", owner.id)
      .eq("payout_balance_cents", payoutBalance)
      .select("id");

    if (claimErr) {
      return NextResponse.json(
        { error: true, code: "PAYOUT_FAILED", message: "Could not reserve payout balance" },
        { status: 500 }
      );
    }
    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        {
          error: true,
          code: "PAYOUT_IN_PROGRESS",
          message: "Payout balance changed while processing; another payout may be in progress. Retry shortly.",
        },
        { status: 409 }
      );
    }

    // The period this payout covers runs from the end of the last recorded
    // payout (or provider signup) to now.
    const periodEnd = new Date().toISOString();
    const { data: lastPayout } = await sb
      .from("bazaar_payouts")
      .select("period_end")
      .eq("provider_id", owner.id)
      .order("period_end", { ascending: false })
      .limit(1);
    const periodStart = lastPayout?.[0]?.period_end ?? provider.created_at ?? periodEnd;
    const grossCents = Math.round(payoutBalance / (1 - PLATFORM_FEE_RATE));
    const payoutRow = {
      provider_id: owner.id,
      period_start: periodStart,
      period_end: periodEnd,
      gross_revenue_cents: grossCents,
      platform_fee_cents: grossCents - payoutBalance,
      net_payout_cents: payoutBalance,
    };

    // Live mode: create Stripe Transfer
    let transfer: { id: string };
    try {
      transfer = await stripe.transfers.create({
        amount: payoutBalance,
        currency: "usd",
        destination: provider.stripe_account_id,
        metadata: {
          bazaar_provider_id: owner.id,
          provider_name: owner.name,
        },
      });
    } catch (err: unknown) {
      if (!isDefiniteStripeRejection(err)) {
        // A timeout, dropped connection or 5xx does not mean the transfer
        // failed: Stripe may have made it. Giving the balance back here would
        // let the next request pay the same earnings again, so keep it claimed
        // and leave a processing row for reconciliation against Stripe.
        const { error: pendingErr } = await sb.from("bazaar_payouts").insert({ ...payoutRow, status: "processing" });
        console.error(
          `[PAYOUT] Transfer of ${payoutBalance} cents for provider ${owner.id} has an unknown outcome` +
            (pendingErr ? ` and was not recorded: ${pendingErr.message}` : "; recorded as processing")
        );
        return NextResponse.json(
          {
            error: true,
            code: "PAYOUT_UNCONFIRMED",
            message: "Stripe did not confirm the transfer. The balance is held until the payout is reconciled; do not retry.",
          },
          { status: 502 }
        );
      }

      // Stripe answered with a 4xx, so no transfer was made.
      const restored = await restoreBalance(sb, owner.id, payoutBalance);
      if (!restored) {
        console.error(`[PAYOUT] Transfer failed and ${payoutBalance} cents could not be restored for provider ${owner.id}`);
      }
      const message = err instanceof Error ? err.message : "Unknown Stripe error";
      return NextResponse.json(
        { error: true, code: "STRIPE_ERROR", message },
        { status: 500 }
      );
    }

    // Record payout. The transfer has already been made, so a failed insert is
    // logged for reconciliation rather than reported as a failed payout.
    const { error: recordErr } = await sb.from("bazaar_payouts").insert({
      ...payoutRow,
      stripe_transfer_id: transfer.id,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (recordErr) {
      console.error(`[PAYOUT] Transfer ${transfer.id} succeeded but was not recorded: ${recordErr.message}`);
    }

    return NextResponse.json({
      mode: "live",
      payout_cents: payoutBalance,
      payout: `$${(payoutBalance / 100).toFixed(2)}`,
      stripe_transfer_id: transfer.id,
      message: "Payout initiated. Funds will arrive in your connected bank account in 2-7 business days.",
    });
  }

  // Dry-run mode
  return NextResponse.json({
    mode: "dry_run",
    would_payout_cents: payoutBalance,
    would_payout: `$${(payoutBalance / 100).toFixed(2)}`,
    stripe_connected: !!provider.stripe_account_id,
    stripe_configured: !!stripe,
    message: "Payout simulated (dry-run mode).",
    requirements: {
      ...(! stripe ? { stripe_keys: "Set STRIPE_SECRET_KEY in environment" } : {}),
      ...(!provider.stripe_account_id ? { connect: "Complete Stripe Connect onboarding first (POST /api/bazaar/connect)" } : {}),
    },
  });
}

/**
 * True only when Stripe answered and refused the request. Stripe does not
 * process a request it answers with a 4xx, except 409 (a conflicting request
 * with the same idempotency key, which may have succeeded). Connection errors,
 * timeouts and 5xx responses are ambiguous.
 */
function isDefiniteStripeRejection(err: unknown): boolean {
  const status = (err as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 409;
}

/**
 * Give a claimed balance back after a failed transfer. Compare-and-swap so
 * earnings credited in the meantime are kept.
 */
async function restoreBalance(
  sb: ReturnType<typeof getSupabase>,
  providerId: string,
  cents: number
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: current } = await sb
      .from("bazaar_providers")
      .select("payout_balance_cents")
      .eq("id", providerId)
      .single();
    const balance = current?.payout_balance_cents ?? 0;
    const { data: updated, error } = await sb
      .from("bazaar_providers")
      .update({ payout_balance_cents: balance + cents, updated_at: new Date().toISOString() })
      .eq("id", providerId)
      .eq("payout_balance_cents", balance)
      .select("id");
    if (!error && updated && updated.length > 0) return true;
  }
  return false;
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

  const { data: provider, error: providerErr } = await sb
    .from("bazaar_providers")
    .select("payout_balance_cents, stripe_account_id")
    .eq("id", owner.id)
    .single();

  const { data: payouts, error: payoutsErr } = await sb
    .from("bazaar_payouts")
    .select("*")
    .eq("provider_id", owner.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // An error must not read as "$0 pending, no payouts".
  if (providerErr || !provider || payoutsErr) {
    return NextResponse.json(
      { error: true, code: "PAYOUT_LOOKUP_FAILED", message: "Could not load payout balance or history" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    provider_id: owner.id,
    pending_balance_cents: provider.payout_balance_cents ?? 0,
    pending_balance: `$${((provider.payout_balance_cents ?? 0) / 100).toFixed(2)}`,
    stripe_connected: !!provider.stripe_account_id,
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
