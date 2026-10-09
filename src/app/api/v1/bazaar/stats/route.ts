import { NextResponse } from "next/server";
import { filterCatalogRows, countRealProviders } from "@/lib/catalog-hygiene";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/v1/bazaar/stats — Public Bazaar statistics dashboard
 * No auth required. Returns proof-of-life metrics.
 */
export async function GET() {
  const sb = getSupabase();

  try {
    // Total tool invocations
    const { count: totalInvocations } = await sb
      .from("bazaar_usage_logs")
      .select("id", { count: "exact", head: true });

    // Successful invocations
    const { count: successfulCalls } = await sb
      .from("bazaar_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "success");

    // Unique consumers (agents)
    const { data: consumers } = await sb
      .from("bazaar_consumers")
      .select("id", { count: "exact", head: true });

    // Public tools and their distinct providers use the catalog hygiene policy.
    const { data: tools } = await sb
      .from("bazaar_tools")
      .select(`
        id,
        bazaar_providers:provider_id (
          id, name, email, endpoint_url, api_key_hash, api_key_prefix
        )
      `)
      .eq("active", true);
    const filtered = filterCatalogRows(tools || []);

    // Total revenue
    const { data: revData } = await sb
      .from("bazaar_usage_logs")
      .select("cost_cents")
      .eq("status", "success");

    const totalRevenueCents = (revData || []).reduce((s: number, r: { cost_cents: number }) => s + (r.cost_cents || 0), 0);

    // Average response time
    const { data: latencyData } = await sb
      .from("bazaar_usage_logs")
      .select("latency_ms")
      .eq("status", "success")
      .not("latency_ms", "is", null)
      .limit(1000);

    const avgLatency = latencyData && latencyData.length > 0
      ? Math.round(latencyData.reduce((s: number, r: { latency_ms: number }) => s + r.latency_ms, 0) / latencyData.length)
      : 0;

    // Last invocation
    const { data: lastLog } = await sb
      .from("bazaar_usage_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    // Free tier percentage
    const freeCalls = totalRevenueCents === 0 ? (totalInvocations || 0) : 0;
    const freePct = (totalInvocations || 0) > 0
      ? Math.round((freeCalls / (totalInvocations || 1)) * 100)
      : 100;

    return NextResponse.json({
      total_tool_invocations: totalInvocations || 0,
      successful_calls: successfulCalls || 0,
      unique_agents: consumers?.length || 0,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: true, message },
      { status: 500 }
    );
  }
}
