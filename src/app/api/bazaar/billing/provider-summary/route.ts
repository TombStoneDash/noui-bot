import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";

const PLATFORM_FEE_RATE = 0.10; // 10% platform fee

export async function POST(request: Request) {
  // Authenticate — must be a provider
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required" },
      { status: 401 }
    );
  }

  // Parse optional period from body
  let period = "30d";
  try {
    const body = await request.json();
    if (body.period) period = body.period;
  } catch {
    // no body is fine — use defaults
  }

  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = new Date(0);
      break;
    case "30d":
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const sb = getSupabase();

  // Fetch usage logs for this provider in period
  const { data: logs, error: logErr } = await sb
    .from("bazaar_usage_logs")
    .select("cost_cents, status, created_at, tool_id, bazaar_tools:tool_id (tool_name, display_name)")
    .eq("provider_id", owner.id)
    .eq("status", "success")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(10000);

  if (logErr) {
    return NextResponse.json(
      { error: true, message: logErr.message },
      { status: 500 }
    );
  }

  const entries = logs || [];
  const grossRevenueCents = entries.reduce((s: number, e: any) => s + (e.cost_cents || 0), 0);
  const platformFeeCents = Math.round(grossRevenueCents * PLATFORM_FEE_RATE);
  const netEarningsCents = grossRevenueCents - platformFeeCents;

  // Earnings by tool
  const toolMap = new Map<string, { name: string; calls: number; gross: number }>();
  for (const e of entries as any[]) {
    const toolName = e.bazaar_tools?.display_name || e.bazaar_tools?.tool_name || e.tool_id;
    const existing = toolMap.get(e.tool_id) || { name: toolName, calls: 0, gross: 0 };
    existing.calls += 1;
    existing.gross += e.cost_cents || 0;
    toolMap.set(e.tool_id, existing);
  }

  const earningsByTool = Array.from(toolMap.values())
    .sort((a, b) => b.gross - a.gross)
    .map((t) => ({
      tool: t.name,
      calls: t.calls,
      gross_cents: t.gross,
      platform_fee_cents: Math.round(t.gross * PLATFORM_FEE_RATE),
      net_cents: t.gross - Math.round(t.gross * PLATFORM_FEE_RATE),
    }));

  // Earnings by week
  const weekMap = new Map<string, { gross: number; calls: number }>();
  for (const e of entries as any[]) {
    const d = new Date(e.created_at as string);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay()); // Sunday start
    const key = weekStart.toISOString().slice(0, 10);
    const existing = weekMap.get(key) || { gross: 0, calls: 0 };
    existing.gross += e.cost_cents || 0;
    existing.calls += 1;
    weekMap.set(key, existing);
  }

  const earningsByWeek = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, stats]) => ({
      week_of: week,
      calls: stats.calls,
      gross_cents: stats.gross,
      net_cents: stats.gross - Math.round(stats.gross * PLATFORM_FEE_RATE),
    }));

  // Fetch last payout
  const { data: lastPayout } = await sb
    .from("bazaar_payouts")
    .select("*")
    .eq("provider_id", owner.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch payout balance from provider record
  const { data: providerRecord } = await sb
    .from("bazaar_providers")
    .select("payout_balance_cents")
    .eq("id", owner.id)
    .single();

  return NextResponse.json({
    provider: { id: owner.id, name: owner.name },
    period,
    platform_fee_rate: `${PLATFORM_FEE_RATE * 100}%`,
    earnings: {
      gross_revenue_cents: grossRevenueCents,
      gross_revenue: `$${(grossRevenueCents / 100).toFixed(2)}`,
      platform_fee_cents: platformFeeCents,
      platform_fee: `$${(platformFeeCents / 100).toFixed(2)}`,
      net_earnings_cents: netEarningsCents,
      net_earnings: `$${(netEarningsCents / 100).toFixed(2)}`,
    },
    payout: {
      pending_balance_cents: providerRecord?.payout_balance_cents ?? 0,
      pending_balance: `$${((providerRecord?.payout_balance_cents ?? 0) / 100).toFixed(2)}`,
      last_payout_date: lastPayout?.paid_at || null,
      last_payout_cents: lastPayout?.net_payout_cents || null,
    },
    by_tool: earningsByTool,
    by_week: earningsByWeek,
  });
}
