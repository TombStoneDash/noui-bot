import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type Stripe from "stripe";
import { authenticateKey, type KeyOwner } from "@/lib/bazaar-auth";
import { getStripe } from "@/lib/stripe";

/** Caller-supplied redirect URL (absolute https), the fallback when absent, or null when invalid. */
function redirectUrl(value: unknown, fallback: string): string | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Return the provider's Connect account, creating it at most once.
 * The idempotency key makes concurrent first calls share one Stripe account,
 * and the conditional update never replaces an account that is already linked
 * (payouts go to whichever account is stored).
 */
async function ensureConnectAccount(stripe: Stripe, owner: KeyOwner): Promise<string> {
  const sb = getSupabase();
  const { data: provider } = await sb
    .from("bazaar_providers")
    .select("stripe_account_id")
    .eq("id", owner.id)
    .single();
  if (provider?.stripe_account_id) return provider.stripe_account_id;

  const account = await stripe.accounts.create(
    {
      type: "express",
      email: owner.email,
      metadata: {
        bazaar_provider_id: owner.id,
        provider_name: owner.name,
      },
      capabilities: {
        transfers: { requested: true },
      },
    },
    { idempotencyKey: `bazaar-provider-connect-${owner.id}` }
  );

  const { data: linked } = await sb
    .from("bazaar_providers")
    .update({
      stripe_account_id: account.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", owner.id)
    .is("stripe_account_id", null)
    .select("stripe_account_id");
  if (linked && linked.length > 0) return account.id;

  // Another request linked an account first; use that one.
  const { data: winner } = await sb
    .from("bazaar_providers")
    .select("stripe_account_id")
    .eq("id", owner.id)
    .single();
  return winner?.stripe_account_id || account.id;
}

/**
 * POST /api/bazaar/connect — Start Stripe Connect onboarding
 * Creates a Stripe Connect account for the provider and returns an onboarding link.
 */
export async function POST(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required" },
      { status: 401 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: true, code: "NOT_CONFIGURED", message: "Stripe is not configured yet" },
      { status: 503 }
    );
  }

  // Validate redirect URLs before creating anything in Stripe
  const body = await request.json().catch(() => ({}));
  const returnUrl = redirectUrl(body?.return_url, "https://noui.bot/bazaar/connect/complete");
  const refreshUrl = redirectUrl(body?.refresh_url, "https://noui.bot/bazaar/connect/refresh");
  if (!returnUrl || !refreshUrl) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "return_url and refresh_url must be absolute https URLs" },
      { status: 422 }
    );
  }

  let accountId: string;
  let accountLink: Stripe.AccountLink;
  try {
    accountId = await ensureConnectAccount(stripe, owner);

    // Create an account link for onboarding
    accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
  } catch (err: unknown) {
    console.error("[connect] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: true, code: "STRIPE_ERROR", message: "Could not start Stripe Connect onboarding" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    provider_id: owner.id,
    stripe_account_id: accountId,
    onboarding_url: accountLink.url,
    expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
  });
}

/**
 * GET /api/bazaar/connect — Check Stripe Connect onboarding status
 */
export async function GET(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required" },
      { status: 401 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: true, code: "NOT_CONFIGURED", message: "Stripe is not configured yet" },
      { status: 503 }
    );
  }

  const sb = getSupabase();

  const { data: provider } = await sb
    .from("bazaar_providers")
    .select("stripe_account_id")
    .eq("id", owner.id)
    .single();

  if (!provider?.stripe_account_id) {
    return NextResponse.json({
      provider_id: owner.id,
      status: "not_started",
      message: "No Stripe Connect account. POST to this endpoint to begin onboarding.",
    });
  }

  const account = await stripe.accounts.retrieve(provider.stripe_account_id);

  return NextResponse.json({
    provider_id: owner.id,
    stripe_account_id: account.id,
    status: account.details_submitted ? "complete" : "pending",
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements: {
      currently_due: account.requirements?.currently_due || [],
      eventually_due: account.requirements?.eventually_due || [],
      errors: account.requirements?.errors || [],
    },
  });
}
