import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const DISPUTE_ID = /^disp_[0-9a-f]{16,}$/;
// PostgREST reports "no rows" from .single() with this code.
const NO_ROWS = "PGRST116";

/**
 * GET /api/v1/bazaar/disputes/:id — Fetch a single dispute
 * Public endpoint — dispute status is transparent.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params;

  if (!DISPUTE_ID.test(disputeId)) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: "Dispute not found (dispute IDs look like disp_ followed by hex)" },
      { status: 404 }
    );
  }

  const sb = getSupabase();

  const { data: dispute, error } = await sb
    .from("bazaar_disputes")
    .select("*")
    .eq("dispute_id", disputeId)
    .single();

  if (error && error.code !== NO_ROWS) {
    console.error("[disputes] lookup failed:", error.message);
    return NextResponse.json(
      { error: true, code: "SERVICE_UNAVAILABLE", message: "Dispute lookup is temporarily unavailable" },
      { status: 503 }
    );
  }

  if (!dispute) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Dispute ${disputeId} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    dispute_id: dispute.dispute_id,
    receipt_id: dispute.receipt_id,
    filed_by: dispute.filed_by,
    filed_by_type: dispute.filed_by_type,
    reason: dispute.reason,
    description: dispute.description,
    status: dispute.status,
    resolution_notes: dispute.resolution_notes,
    created_at: dispute.created_at,
    resolved_at: dispute.resolved_at,
    receipt_url: `https://noui.bot/api/v1/bazaar/receipts/${dispute.receipt_id}`,
  });
}
