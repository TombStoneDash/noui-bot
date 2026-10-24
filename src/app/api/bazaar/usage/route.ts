import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { parsePagination } from "@/lib/pagination";

export async function GET(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner) {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid API key required" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "30d";
  // An unknown period used to fall through to 30d while the response still
  // echoed the requested value, mislabelling the data.
  if (!["24h", "7d", "30d", "90d"].includes(period)) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "period must be one of: 24h | 7d | 30d | 90d" },
      { status: 400 }
    );
  }
  const page = parsePagination(url.searchParams, { defaultLimit: 50, maxLimit: 200 });
  if ("error" in page) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: page.error },
      { status: 400 }
    );
  }
  const { limit } = page;

  const sb = getSupabase();

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  // Build query based on owner type
  const filterCol = owner.type === "consumer" ? "consumer_id" : "provider_id";

  // Get usage logs
  const { data: logs, error: logErr } = await sb
    .from("bazaar_usage_logs")
    .select(`
      id,
      status,
      cost_cents,
      latency_ms,
      created_at,
      bazaar_tools:tool_id (tool_name, display_name)
    `)
    .eq(filterCol, owner.id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (logErr) {
    console.error("[usage] log query failed:", logErr.message);
    return NextResponse.json(
      { error: true, code: "SERVICE_UNAVAILABLE", message: "Usage is temporarily unavailable" },
      { status: 500 }
    );
  }

  // Calculate summary
  const entries = logs || [];
  const totalCalls = entries.length;
  const successCalls = entries.filter((e: any) => e.status === "success").length;
  const totalCostCents = entries.reduce((sum: number, e: any) => sum + (e.cost_cents || 0), 0);
  const avgLatency = totalCalls > 0
    ? Math.round(entries.reduce((sum: number, e: any) => sum + (e.latency_ms || 0), 0) / totalCalls)
    : 0;

  return NextResponse.json({
    owner: {
      id: owner.id,
      type: owner.type,
      name: owner.name,
      ...(owner.type === "consumer" ? { balance_cents: owner.balance_cents } : {}),
    },
    period,
    summary: {
      total_calls: totalCalls,
      successful_calls: successCalls,
      error_rate: totalCalls > 0 ? `${(((totalCalls - successCalls) / totalCalls) * 100).toFixed(1)}%` : "0%",
      total_cost_cents: totalCostCents,
      total_cost: `$${(totalCostCents / 100).toFixed(2)}`,
      avg_latency_ms: avgLatency,
      // These figures cover the returned recent_calls only (at most `limit`).
      // Use /api/bazaar/usage/summary for whole-period totals.
      calls_included: totalCalls,
      truncated: totalCalls >= limit,
    },
    recent_calls: entries.map((e: any) => ({
      id: e.id,
      tool: e.bazaar_tools?.display_name || e.bazaar_tools?.tool_name || "unknown",
      status: e.status,
      cost_cents: e.cost_cents,
      latency_ms: e.latency_ms,
      created_at: e.created_at,
    })),
  });
}
