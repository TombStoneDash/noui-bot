import { NextResponse } from "next/server";
import { authenticateKey as authenticateRequest } from "@/lib/bazaar-auth";
import { getSupabase } from "@/lib/supabase";
import { PLANS, type PlanId, hasFeature } from "@/lib/subscription";

const PLAN_DETAILS: Record<string, { name: string; calls_per_month: number; fee_rate: string; rpm: number; price: string }> = Object.fromEntries(
  Object.entries(PLANS).map(([id, p]) => [
    id,
    { name: p.name, calls_per_month: p.callsPerMonth, fee_rate: p.feeRate, rpm: p.rpm, price: p.price },
  ])
);

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json(
      { error: true, message: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  if (auth.type !== "consumer") {
    return NextResponse.json(
      { error: true, message: "Subscription info is only available for consumers" },
      { status: 403 }
    );
  }

  const sb = getSupabase();
  const { data: consumer, error } = await sb
    .from("bazaar_consumers")
    .select("subscription_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancelled_at, rate_limit_rpm")
    .eq("id", auth.id)
    .single();

  // A failed lookup must not be reported as "free plan, no subscription" to a paying customer.
  if (error || !consumer) {
    console.error("[subscription] consumer lookup failed:", error?.message ?? "no row");
    return NextResponse.json(
      { error: true, message: "Subscription info is temporarily unavailable" },
      { status: 503 }
    );
  }

  // Resolve unknown plan names to free consistently, so plan, details, features and limits agree.
  const plan: PlanId = Object.hasOwn(PLANS, consumer.subscription_plan) ? consumer.subscription_plan : "free";
  const details = PLAN_DETAILS[plan];
  const planDef = PLANS[plan];

  return NextResponse.json({
    plan,
    plan_details: details,
    subscription_id: consumer.subscription_id || null,
    status: consumer.subscription_status || "none",
    current_period_end: consumer.subscription_current_period_end || null,
    cancelled_at: consumer.subscription_cancelled_at || null,
    rate_limit_rpm: consumer.rate_limit_rpm || PLANS.free.rpm,
    features: {
      unlimited_agents: hasFeature(plan, "unlimited_agents"),
      priority_support: hasFeature(plan, "priority_support"),
      custom_domains: hasFeature(plan, "custom_domains"),
      advanced_analytics: hasFeature(plan, "advanced_analytics"),
    },
    agent_limit: planDef.agents === "unlimited" ? null : planDef.agents,
  });
}
