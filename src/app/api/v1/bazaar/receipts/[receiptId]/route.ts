import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyReceiptEnvelope } from "@/lib/receipt-verify";

const RECEIPT_ID = /^rcpt_[0-9a-f]{16,}$/;
// PostgREST reports "no rows" from .single() with this code.
const NO_ROWS = "PGRST116";

/**
 * Receipts are signed over `new Date().toISOString()`, but `timestamp` is a
 * TIMESTAMPTZ column: PostgREST returns it as "…+00:00" and trims trailing
 * zero milliseconds. Re-render it as the exact string that was signed.
 */
function signedTimestamp(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

/**
 * GET /api/v1/bazaar/receipts/:receiptId — Fetch and verify a single receipt
 * Public endpoint — anyone with the receipt_id can verify authenticity.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await params;

  if (!RECEIPT_ID.test(receiptId)) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: "Receipt not found (receipt IDs look like rcpt_ followed by hex)" },
      { status: 404 }
    );
  }

  const sb = getSupabase();
  const { data: receipt, error } = await sb
    .from("bazaar_receipts")
    .select("*")
    .eq("receipt_id", receiptId)
    .single();

  if (error && error.code !== NO_ROWS) {
    console.error("[receipts] lookup failed:", error.message);
    return NextResponse.json(
      { error: true, code: "SERVICE_UNAVAILABLE", message: "Receipt lookup is temporarily unavailable" },
      { status: 503 }
    );
  }

  if (!receipt) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Receipt ${receiptId} not found` },
      { status: 404 }
    );
  }

  const timestamp = signedTimestamp(receipt.timestamp);
  const verification = verifyReceiptEnvelope({
    receipt_id: receipt.receipt_id,
    tool_id: receipt.tool_id,
    agent_id: receipt.agent_id,
    provider_id: receipt.provider_id,
    timestamp,
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
      // The signed form, so this object can be posted to /api/v1/verify as-is.
      timestamp,
      duration_ms: receipt.duration_ms,
      cost_microcents: receipt.cost_microcents,
      status: receipt.status,
      signature: receipt.signature,
      created_at: receipt.created_at,
    },
    verification: {
      valid: verification.valid,
      reason: verification.reason,
      algorithm: "HMAC-SHA256",
      verified_at: verification.verified_at,
    },
  });
}
