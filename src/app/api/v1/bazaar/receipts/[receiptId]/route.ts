import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyReceipt } from "@/lib/receipts";

/**
 * GET /api/v1/bazaar/receipts/:receiptId — Fetch and verify a single receipt
 * Public endpoint — anyone with the receipt_id can verify authenticity.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await params;

  const sb = getSupabase();
  const { data: receipt, error } = await sb
    .from("bazaar_receipts")
    .select("*")
    .eq("receipt_id", receiptId)
    .single();

  if (error || !receipt) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Receipt ${receiptId} not found` },
      { status: 404 }
    );
  }

  // Verify the signature
  const isValid = verifyReceipt({
    receipt_id: receipt.receipt_id,
    tool_id: receipt.tool_id,
    agent_id: receipt.agent_id,
    provider_id: receipt.provider_id,
    timestamp: receipt.timestamp,
    cost_microcents: receipt.cost_microcents,
    status: receipt.status,
    signature: receipt.signature,
  });

  return NextResponse.json({
    receipt: {
      receipt_id: receipt.receipt_id,
      tool_id: receipt.tool_id,
      tool_name: receipt.tool_name,
      agent_id: receipt.agent_id,
      provider_id: receipt.provider_id,
      timestamp: receipt.timestamp,
      duration_ms: receipt.duration_ms,
      cost_microcents: receipt.cost_microcents,
      status: receipt.status,
      signature: receipt.signature,
      created_at: receipt.created_at,
    },
    verification: {
      valid: isValid,
      algorithm: "HMAC-SHA256",
      verified_at: new Date().toISOString(),
    },
  });
}
