import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { getStripe } from "@/lib/stripe";

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

  const sb = getSupabase();

  // Check if provider already has a Stripe account
  const { data: provider } = await sb
    .from("bazaar_providers")
    .select("stripe_account_id")
    .eq("id", owner.id)
    .single();

  let accountId = provider?.stripe_account_id;

  // Create a Stripe Connect account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: owner.email,
      metadata: {
        bazaar_provider_id: owner.id,
        provider_name: owner.name,
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    accountId = account.id;

    // Save to DB
    await sb
      .from("bazaar_providers")
      .update({
        stripe_account_id: accountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", owner.id);
  }

  // Create an account link for onboarding
  const body = await request.json().catch(() => ({})) as Record<string, string>;
  const returnUrl = body.return_url || "https://noui.bot/bazaar/connect/complete";
  const refreshUrl = body.refresh_url || "https://noui.bot/bazaar/connect/refresh";

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

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
