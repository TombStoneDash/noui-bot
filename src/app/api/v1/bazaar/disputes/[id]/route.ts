import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/v1/bazaar/disputes/:id — Fetch a single dispute
 * Public endpoint — dispute status is transparent.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params;
  const sb = getSupabase();

  const { data: dispute, error } = await sb
    .from("bazaar_disputes")
    .select("*")
    .eq("dispute_id", disputeId)
    .single();

  if (error || !dispute) {
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
