import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/bazaar-auth";
import { getSupabase } from "@/lib/supabase";

const PLAN_DETAILS: Record<string, { name: string; calls_per_month: number; fee_rate: string; rpm: number; price: string }> = {
  free: { name: "Free", calls_per_month: 100, fee_rate: "10%", rpm: 60, price: "$0" },
  pro: { name: "Pro", calls_per_month: 10_000, fee_rate: "8%", rpm: 300, price: "$29/mo" },
  scale: { name: "Scale", calls_per_month: 100_000, fee_rate: "5%", rpm: 1_000, price: "$99/mo" },
};

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
  const { data: consumer } = await sb
    .from("bazaar_consumers")
    .select("subscription_id, subscription_plan, subscription_status, subscription_current_period_end, subscription_cancelled_at, rate_limit_rpm")
    .eq("id", auth.id)
    .single();

  const plan = consumer?.subscription_plan || "free";
  const details = PLAN_DETAILS[plan] || PLAN_DETAILS.free;

  return NextResponse.json({
    plan,
    plan_details: details,
    subscription_id: consumer?.subscription_id || null,
    status: consumer?.subscription_status || "none",
    current_period_end: consumer?.subscription_current_period_end || null,
    cancelled_at: consumer?.subscription_cancelled_at || null,
    rate_limit_rpm: consumer?.rate_limit_rpm || 60,
  });
}
