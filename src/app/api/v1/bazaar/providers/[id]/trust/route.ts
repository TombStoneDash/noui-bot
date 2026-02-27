import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/v1/bazaar/providers/:id/trust — Composite trust score
 * Public endpoint. Combines verification, SLA metrics, and dispute history.
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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get usage logs
  const { data: logs } = await sb
    .from("bazaar_usage_logs")
    .select("status, latency_ms")
    .eq("provider_id", providerId)
    .gte("created_at", thirtyDaysAgo);

  const totalCalls = logs?.length || 0;
  const successCalls = logs?.filter((l) => l.status === "success").length || 0;

  // Get latencies
  const latencies = (logs || [])
    .map((l) => l.latency_ms)
    .filter((l): l is number => l != null && l > 0)
    .sort((a, b) => a - b);

  const p95 = latencies.length > 0
    ? latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1]
    : 0;

  // Count disputes — look up through receipts
  const { data: providerReceipts } = await sb
    .from("bazaar_receipts")
    .select("receipt_id")
    .eq("provider_id", providerId);

  const receiptIds = (providerReceipts || []).map((r) => r.receipt_id);
  let totalDisputes = 0;
  let resolvedDenied = 0;
  if (receiptIds.length > 0) {
    const { count: tc } = await sb
      .from("bazaar_disputes")
      .select("*", { count: "exact", head: true })
      .in("receipt_id", receiptIds);
    totalDisputes = tc || 0;

    const { count: rd } = await sb
      .from("bazaar_disputes")
      .select("*", { count: "exact", head: true })
      .in("receipt_id", receiptIds)
      .eq("status", "resolved_denied");
    resolvedDenied = rd || 0;
  }

  // ── COMPONENT SCORING ──

  // 1. Verification (0-25)
  const verificationScores: Record<string, number> = {
    unverified: 0,
    email: 10,
    domain: 20,
    code: 25,
  };
  const verificationScore = verificationScores[provider.verification_level || "unverified"] || 0;

  // 2. Uptime (0-25)
  let uptimeScore = 25; // Default full score for new providers
  if (totalCalls > 0) {
    const uptimePercent = (successCalls / totalCalls) * 100;
    if (uptimePercent >= 99.9) uptimeScore = 25;
    else if (uptimePercent >= 99.5) uptimeScore = 23;
    else if (uptimePercent >= 99.0) uptimeScore = 20;
    else if (uptimePercent >= 98.0) uptimeScore = 17;
    else if (uptimePercent >= 95.0) uptimeScore = 12;
    else if (uptimePercent >= 90.0) uptimeScore = 8;
    else uptimeScore = 3;
  }

  // 3. Latency (0-25) — lower p95 = higher score
  let latencyScore = 25; // Default for new providers
  if (p95 > 0) {
    if (p95 <= 200) latencyScore = 25;
    else if (p95 <= 500) latencyScore = 22;
    else if (p95 <= 1000) latencyScore = 18;
    else if (p95 <= 2000) latencyScore = 14;
    else if (p95 <= 5000) latencyScore = 8;
    else latencyScore = 3;
  }

  // 4. Disputes (0-25) — fewer disputes = higher score
  let disputeScore = 25; // Default for no disputes
  if (totalCalls > 0 && (totalDisputes || 0) > 0) {
    const disputeRate = (totalDisputes || 0) / totalCalls;
    const legitimateDisputes = (totalDisputes || 0) - (resolvedDenied || 0);
    if (legitimateDisputes === 0) disputeScore = 24;
    else if (disputeRate < 0.01) disputeScore = 20;
    else if (disputeRate < 0.05) disputeScore = 15;
    else if (disputeRate < 0.10) disputeScore = 8;
    else disputeScore = 2;
  }

  const totalScore = verificationScore + uptimeScore + latencyScore + disputeScore;

  // Determine badge
  let badge: string;
  if (totalScore >= 75) badge = "verified";
  else if (totalScore >= 50) badge = "trusted";
  else if (totalScore >= 25) badge = "basic";
  else badge = "unrated";

  return NextResponse.json({
    provider_id: providerId,
    provider_name: provider.name,
    trust_score: totalScore,
    badge,
    components: {
      verification: verificationScore,
      uptime: uptimeScore,
      latency: latencyScore,
      disputes: disputeScore,
    },
    details: {
      verification_level: provider.verification_level || "unverified",
      verified_at: provider.verified_at,
      total_calls_30d: totalCalls,
      success_rate: totalCalls > 0 ? parseFloat(((successCalls / totalCalls) * 100).toFixed(2)) : null,
      p95_latency_ms: p95 || null,
      total_disputes: totalDisputes || 0,
    },
    scoring_guide: {
      verification: "unverified=0, email=10, domain=20, code=25",
      uptime: "99.9%+=25, 99.5%+=23, 99%+=20, 98%+=17, 95%+=12, 90%+=8, <90%=3",
      latency: "≤200ms=25, ≤500ms=22, ≤1s=18, ≤2s=14, ≤5s=8, >5s=3",
      disputes: "none=25, all denied=24, <1%=20, <5%=15, <10%=8, ≥10%=2",
    },
  });
}
