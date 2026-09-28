import { NextResponse } from "next/server";
import { verifyReceiptEnvelope } from "@/lib/receipt-verify";
import { getSupabase } from "@/lib/supabase";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST" },
      { status: 400, headers: HEADERS }
    );
  }

  const receipt = body !== null && typeof body === "object" && !Array.isArray(body) && "receipt" in body
    ? body.receipt
    : body;
  return NextResponse.json(
    { receipt, verification: verifyReceiptEnvelope(receipt) },
    { headers: HEADERS }
  );
}

export async function GET(request: Request) {
  const receiptId = new URL(request.url).searchParams.get("receipt_id");
  if (!receiptId) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "receipt_id is required" },
      { status: 422, headers: HEADERS }
    );
  }

  const sb = getSupabase();
  const { data: receipt, error } = await sb
    .from("bazaar_receipts")
    .select("*")
    .eq("receipt_id", receiptId)
    .single();

  if (error || !receipt) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Receipt ${receiptId} not found` },
      { status: 404, headers: HEADERS }
    );
  }

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
    verification: verifyReceiptEnvelope(receipt),
  }, { headers: HEADERS });
}
