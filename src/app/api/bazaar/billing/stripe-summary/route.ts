import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { getStripe, PLATFORM_FEE_RATE } from "@/lib/stripe";

/** Shape of a row returned from the bazaar_usage_logs join query. */
interface UsageLogRow {
  id: string;
  status: string;
  cost_cents: number;
  latency_ms: number | null;
  created_at: string;
  consumer_id: string | null;
  tool_id: string;
  bazaar_tools: { tool_name: string; display_name: string | null }[] | { tool_name: string; display_name: string | null } | null;
}

/**
 * POST /api/bazaar/billing/stripe-summary
 *
 * Returns Stripe-enriched billing data for an agent operator:
 * - Revenue metrics (all-time, this month, this week)
 * - Transaction count & average
 * - Daily revenue for charting (last 30 days)
 * - Recent transactions with Stripe payment status
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
  const now = new Date();

  // Time boundaries
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch ALL usage logs for this provider (for all-time stats)
  const { data: allLogs, error: allErr } = await sb
    .from("bazaar_usage_logs")
    .select("id, status, cost_cents, latency_ms, created_at, consumer_id, tool_id, bazaar_tools:tool_id (tool_name, display_name)")
    .eq("provider_id", owner.id)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (allErr) {
    return NextResponse.json(
      { error: true, message: allErr.message },
      { status: 500 }
    );
  }

  const entries = (allLogs || []) as UsageLogRow[];

  // Categorize by time window
  const allTime = entries;
  const thisMonth = entries.filter((e) => new Date(e.created_at) >= monthAgo);
  const thisWeek = entries.filter((e) => new Date(e.created_at) >= weekAgo);

  function computeStats(logs: UsageLogRow[]) {
    const succeeded = logs.filter((l) => l.status === "success");
    const failed = logs.filter((l) => l.status === "error" || l.status === "failed");
    const refunded = logs.filter((l) => l.status === "refunded");
    const grossCents = succeeded.reduce((s, l) => s + (l.cost_cents || 0), 0);
    const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
    const netCents = grossCents - platformFeeCents;
    const avgCents = succeeded.length > 0 ? Math.round(grossCents / succeeded.length) : 0;

    return {
      total_transactions: logs.length,
      succeeded_count: succeeded.length,
      failed_count: failed.length,
      refunded_count: refunded.length,
      gross_revenue_cents: grossCents,
      platform_fee_cents: platformFeeCents,
      net_revenue_cents: netCents,
      avg_transaction_cents: avgCents,
    };
  }

  const statsAllTime = computeStats(allTime);
  const statsMonth = computeStats(thisMonth);
  const statsWeek = computeStats(thisWeek);

  // Daily revenue for last 30 days (for chart)
  const dayMap = new Map<string, { gross: number; net: number; count: number; succeeded: number; failed: number }>();

  // Initialize all 30 days with zero
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { gross: 0, net: 0, count: 0, succeeded: 0, failed: 0 });
  }

  for (const e of entries) {
    const d = new Date(e.created_at);
    if (d < thirtyDaysAgo) continue;
    const key = d.toISOString().slice(0, 10);
    const existing = dayMap.get(key);
    if (!existing) continue;
    existing.count += 1;
    if (e.status === "success") {
      existing.gross += e.cost_cents || 0;
      existing.net += (e.cost_cents || 0) - Math.round((e.cost_cents || 0) * PLATFORM_FEE_RATE);
      existing.succeeded += 1;
    } else {
      existing.failed += 1;
    }
  }

  const dailyRevenue = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      gross_cents: stats.gross,
      net_cents: stats.net,
      transactions: stats.count,
      succeeded: stats.succeeded,
      failed: stats.failed,
    }));

  // Recent transactions (last 200) with enriched data
  const recentEntries = entries.slice(0, 200);
  const transactions = recentEntries.map((e) => ({
    id: e.id,
    status: e.status === "success" ? "succeeded" : e.status === "error" ? "failed" : e.status,
    amount_cents: e.cost_cents || 0,
    net_cents: (e.cost_cents || 0) - Math.round((e.cost_cents || 0) * PLATFORM_FEE_RATE),
    consumer_id: e.consumer_id || null,
    agent: (Array.isArray(e.bazaar_tools) ? e.bazaar_tools[0]?.display_name || e.bazaar_tools[0]?.tool_name : e.bazaar_tools?.display_name || e.bazaar_tools?.tool_name) || e.tool_id || "unknown",
    latency_ms: e.latency_ms,
    created_at: e.created_at,
  }));

  // Fetch Stripe account status if available
  let stripeAccount = null;
  const stripe = getStripe();
  if (stripe) {
    const { data: providerRecord } = await sb
      .from("bazaar_providers")
      .select("stripe_account_id, payout_balance_cents")
      .eq("id", owner.id)
      .single();

    if (providerRecord?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(providerRecord.stripe_account_id);
        stripeAccount = {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        };
      } catch {
        // Stripe account may not exist or be inaccessible
      }
    }

    if (providerRecord) {
      statsAllTime.net_revenue_cents = Math.max(
        statsAllTime.net_revenue_cents,
        0
      );
    }
  }

  // Fetch webhook config
  const { data: providerConfig } = await sb
    .from("bazaar_providers")
    .select("webhook_url, payout_balance_cents, payout_schedule")
    .eq("id", owner.id)
    .single();

  return NextResponse.json({
    provider: { id: owner.id, name: owner.name },
    revenue: {
      all_time: statsAllTime,
      this_month: statsMonth,
      this_week: statsWeek,
    },
    daily_revenue: dailyRevenue,
    transactions,
    stripe_account: stripeAccount,
    config: {
      webhook_url: providerConfig?.webhook_url || null,
      payout_balance_cents: providerConfig?.payout_balance_cents || 0,
      payout_schedule: providerConfig?.payout_schedule || "monthly",
    },
    platform_fee_rate: `${PLATFORM_FEE_RATE * 100}%`,
  });
}
