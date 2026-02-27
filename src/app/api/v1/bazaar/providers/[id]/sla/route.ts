import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/v1/bazaar/providers/:id/sla — Provider SLA metrics
 * Public endpoint — no auth required. Shows reliability data for any provider.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: providerId } = await params;
  const sb = getSupabase();

  // Verify provider exists
  const { data: provider, error: provErr } = await sb
    .from("bazaar_providers")
    .select("id, name, verification_level, verified_at")
    .eq("id", providerId)
    .single();

  if (provErr || !provider) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Provider ${providerId} not found` },
      { status: 404 }
    );
  }

  // Get usage logs from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs, error: logsErr } = await sb
    .from("bazaar_usage_logs")
    .select("status, latency_ms, created_at")
    .eq("provider_id", providerId)
    .gte("created_at", thirtyDaysAgo);

  if (logsErr) {
    return NextResponse.json(
      { error: true, message: logsErr.message },
      { status: 500 }
    );
  }

  const totalCalls = logs?.length || 0;
  const successCalls = logs?.filter((l) => l.status === "success").length || 0;
  const errorCalls = totalCalls - successCalls;

  // Calculate latency stats
  const latencies = (logs || [])
    .map((l) => l.latency_ms)
    .filter((l): l is number => l != null && l > 0)
    .sort((a, b) => a - b);

  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  const p95Latency = latencies.length > 0
    ? latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1]
    : 0;

  // Count receipts issued
  const { count: receiptsCount } = await sb
    .from("bazaar_receipts")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .gte("created_at", thirtyDaysAgo);

  // Count disputes — look up through receipts
  // Disputes reference receipt_id, and receipts have provider_id
  const { data: providerReceipts } = await sb
    .from("bazaar_receipts")
    .select("receipt_id")
    .eq("provider_id", providerId);

  const receiptIds = (providerReceipts || []).map((r) => r.receipt_id);
  let disputesCount = 0;
  if (receiptIds.length > 0) {
    const { count } = await sb
      .from("bazaar_disputes")
      .select("*", { count: "exact", head: true })
      .in("receipt_id", receiptIds);
    disputesCount = count || 0;
  }

  const uptimePercent = totalCalls > 0
    ? parseFloat(((successCalls / totalCalls) * 100).toFixed(2))
    : 100; // No calls = assume 100%

  const errorRate = totalCalls > 0
    ? parseFloat((errorCalls / totalCalls).toFixed(4))
    : 0;

  return NextResponse.json({
    provider_id: providerId,
    provider_name: provider.name,
    period: "30d",
    period_start: thirtyDaysAgo,
    period_end: new Date().toISOString(),
    uptime_30d: uptimePercent,
    avg_latency_ms: avgLatency,
    p95_latency_ms: p95Latency,
    error_rate_30d: errorRate,
    total_calls_30d: totalCalls,
    successful_calls_30d: successCalls,
    error_calls_30d: errorCalls,
    receipts_issued: receiptsCount || 0,
    disputes: disputesCount || 0,
    verification_level: provider.verification_level || "unverified",
    verified_at: provider.verified_at,
  });
}
