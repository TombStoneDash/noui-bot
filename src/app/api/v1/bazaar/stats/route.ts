import { NextResponse } from "next/server";
import { filterCatalogRows, countRealProviders } from "@/lib/catalog-hygiene";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/v1/bazaar/stats — Public Bazaar statistics dashboard
 * No auth required. Returns proof-of-life metrics.
 */
/** PostgREST returns at most this many rows per request. */
const PAGE_SIZE = 1000;

export async function GET() {
  const sb = getSupabase();
  const unavailable = () =>
    NextResponse.json(
      { error: true, message: "Statistics temporarily unavailable" },
      { status: 503 }
    );

  try {
    // Total tool invocations
    const { count: totalInvocations, error: totalError } = await sb
      .from("bazaar_usage_logs")
      .select("id", { count: "exact", head: true });

    // Successful invocations
    const { count: successfulCalls, error: successError } = await sb
      .from("bazaar_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "success");

    // Successful invocations that cost nothing (free tier or free tools)
    const { count: freeCalls, error: freeError } = await sb
      .from("bazaar_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "success")
      .or("cost_cents.eq.0,cost_cents.is.null");

    // Unique consumers (agents)
    const { count: consumerCount, error: consumerError } = await sb
      .from("bazaar_consumers")
      .select("id", { count: "exact", head: true });

    // A failed count must not be published as zero.
    if (totalError || successError || freeError || consumerError) return unavailable();

    // Public tools and their distinct providers use the catalog hygiene policy.
    const { data: tools, error: toolsError } = await sb
      .from("bazaar_tools")
      .select(`
        id,
        bazaar_providers:provider_id (
          id, name, email, endpoint_url, api_key_hash, api_key_prefix
        )
      `)
      .eq("active", true);
    if (toolsError) return unavailable();
    const filtered = filterCatalogRows(tools || []);

    // Total revenue: page through every paid call, since one request is
    // capped at PAGE_SIZE rows and would otherwise undercount.
    let totalRevenueCents = 0;
    for (let start = 0; ; start += PAGE_SIZE) {
      const { data: revData, error: revError } = await sb
        .from("bazaar_usage_logs")
        .select("cost_cents")
        .eq("status", "success")
        .gt("cost_cents", 0)
        .order("id")
        .range(start, start + PAGE_SIZE - 1);
      if (revError) return unavailable();
      const rows = (revData || []) as { cost_cents: number | null }[];
      totalRevenueCents += rows.reduce((s, r) => s + (r.cost_cents || 0), 0);
      if (rows.length < PAGE_SIZE) break;
    }

    // Average response time over the most recent successful calls
    const { data: latencyData, error: latencyError } = await sb
      .from("bazaar_usage_logs")
      .select("latency_ms")
      .eq("status", "success")
      .not("latency_ms", "is", null)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (latencyError) return unavailable();

    const avgLatency = latencyData && latencyData.length > 0
      ? Math.round(latencyData.reduce((s: number, r: { latency_ms: number }) => s + r.latency_ms, 0) / latencyData.length)
      : 0;

    // Last invocation
    const { data: lastLog, error: lastError } = await sb
      .from("bazaar_usage_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (lastError) return unavailable();

    // Share of successful calls that were free
    const freePct = (successfulCalls || 0) > 0
      ? Math.round(((freeCalls || 0) / (successfulCalls || 1)) * 100)
      : 100;

    return NextResponse.json({
      total_tool_invocations: totalInvocations || 0,
      successful_calls: successfulCalls || 0,
      unique_agents: consumerCount ?? 0,
      unique_tools: filtered.length,
      tools_listed: filtered.length,
      providers: countRealProviders(filtered),
      total_revenue_microcents: totalRevenueCents * 10_000, // 1 cent = 10,000 microcents
      total_revenue_cents: totalRevenueCents,
      total_revenue: `$${(totalRevenueCents / 100).toFixed(2)}`,
      avg_response_time_ms: avgLatency,
      free_tier_usage_pct: freePct,
      last_invocation: lastLog?.[0]?.created_at || null,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return unavailable();
  }
}
