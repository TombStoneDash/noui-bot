import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";

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

  const sb = getSupabase();
  const filterCol = owner.type === "consumer" ? "consumer_id" : "provider_id";

  // Fetch all logs in period (cap at 10k for aggregation)
  const { data: logs, error: logErr } = await sb
    .from("bazaar_usage_logs")
    .select("cost_cents, latency_ms, status, created_at, tool_id, request_size_bytes, response_size_bytes, tokens_input, tokens_output, bazaar_tools:tool_id (tool_name, display_name)")
    .eq(filterCol, owner.id)
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

  // Total spend
  const totalSpendCents = entries.reduce((s: number, e: any) => s + (e.cost_cents || 0), 0);
  const totalCalls = entries.length;
  const successCalls = entries.filter((e: any) => e.status === "success").length;

  // Total data volume
  const totalRequestBytes = entries.reduce((s: number, e: any) => s + (e.request_size_bytes || 0), 0);
  const totalResponseBytes = entries.reduce((s: number, e: any) => s + (e.response_size_bytes || 0), 0);
  const totalTokensInput = entries.reduce((s: number, e: any) => s + (e.tokens_input || 0), 0);
  const totalTokensOutput = entries.reduce((s: number, e: any) => s + (e.tokens_output || 0), 0);

  // Top tools by spend
  const toolMap = new Map<string, { name: string; calls: number; spend: number }>();
  for (const e of entries as any[]) {
    const toolName = e.bazaar_tools?.display_name || e.bazaar_tools?.tool_name || e.tool_id;
    const existing = toolMap.get(e.tool_id) || { name: toolName, calls: 0, spend: 0 };
    existing.calls += 1;
    existing.spend += e.cost_cents || 0;
    toolMap.set(e.tool_id, existing);
  }
  const topTools = Array.from(toolMap.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
    .map((t) => ({
      tool: t.name,
      calls: t.calls,
      spend_cents: t.spend,
      spend: `$${(t.spend / 100).toFixed(2)}`,
    }));

  // Calls by day
  const dayMap = new Map<string, { calls: number; spend: number; errors: number }>();
  for (const e of entries as any[]) {
    const day = (e.created_at as string).slice(0, 10); // YYYY-MM-DD
    const existing = dayMap.get(day) || { calls: 0, spend: 0, errors: 0 };
    existing.calls += 1;
    existing.spend += e.cost_cents || 0;
    if (e.status !== "success") existing.errors += 1;
    dayMap.set(day, existing);
  }
  const callsByDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, stats]) => ({
      date: day,
      calls: stats.calls,
      spend_cents: stats.spend,
      errors: stats.errors,
    }));

  return NextResponse.json({
    owner: { id: owner.id, type: owner.type, name: owner.name },
    period,
    summary: {
      total_calls: totalCalls,
      successful_calls: successCalls,
      error_rate: totalCalls > 0 ? `${(((totalCalls - successCalls) / totalCalls) * 100).toFixed(1)}%` : "0%",
      total_spend_cents: totalSpendCents,
      total_spend: `$${(totalSpendCents / 100).toFixed(2)}`,
      data_volume: {
        request_bytes: totalRequestBytes,
        response_bytes: totalResponseBytes,
        tokens_input: totalTokensInput,
        tokens_output: totalTokensOutput,
      },
    },
    top_tools: topTools,
    calls_by_day: callsByDay,
  });
}
