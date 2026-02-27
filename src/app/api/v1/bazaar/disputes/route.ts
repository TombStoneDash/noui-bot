import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { generateDisputeId } from "@/lib/receipts";

/**
 * POST /api/v1/bazaar/disputes — File a dispute against a receipt
 * GET  /api/v1/bazaar/disputes — List disputes for the authenticated user
 */
export async function POST(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner) {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid API key required" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const receiptId = body.receipt_id as string;
  const reason = body.reason as string;
  const description = body.description as string;
  const evidence = (body.evidence as object) || {};

  if (!receiptId) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "receipt_id required" },
      { status: 422 }
    );
  }

  const validReasons = ["tool_error", "overcharge", "timeout", "quality", "other"];
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json(
      {
        error: true,
        code: "VALIDATION_ERROR",
        message: `reason required: ${validReasons.join(" | ")}`,
      },
      { status: 422 }
    );
  }

  const sb = getSupabase();

  // Verify the receipt exists and belongs to this user
  const { data: receipt, error: receiptErr } = await sb
    .from("bazaar_receipts")
    .select("*")
    .eq("receipt_id", receiptId)
    .single();

  if (receiptErr || !receipt) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Receipt ${receiptId} not found` },
      { status: 404 }
    );
  }

  // Verify the filer is either the agent or provider on the receipt
  const isAgent = receipt.agent_id === owner.id;
  const isProvider = receipt.provider_id === owner.id;
  if (!isAgent && !isProvider) {
    return NextResponse.json(
      {
        error: true,
        code: "FORBIDDEN",
        message: "You can only file disputes for receipts you are party to",
      },
      { status: 403 }
    );
  }

  // Check for existing dispute on this receipt
  const { data: existing } = await sb
    .from("bazaar_disputes")
    .select("dispute_id")
    .eq("receipt_id", receiptId)
    .not("status", "in", '("resolved_denied")')
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      {
        error: true,
        code: "DUPLICATE",
        message: `Active dispute already exists for receipt ${receiptId}: ${existing[0].dispute_id}`,
      },
      { status: 409 }
    );
  }

  const disputeId = generateDisputeId();

  const { error: insertErr } = await sb.from("bazaar_disputes").insert({
    dispute_id: disputeId,
    receipt_id: receiptId,
    filed_by: owner.id,
    filed_by_type: owner.type === "consumer" ? "agent" : "provider",
    reason,
    description: description || null,
    evidence,
    status: "filed",
  });

  if (insertErr) {
    return NextResponse.json(
      { error: true, message: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      dispute_id: disputeId,
      receipt_id: receiptId,
      status: "filed",
      reason,
      filed_by: owner.id,
      filed_by_type: owner.type === "consumer" ? "agent" : "provider",
      created_at: new Date().toISOString(),
      message: "Dispute filed. Status updates will be available at the dispute URL.",
      dispute_url: `https://noui.bot/api/v1/bazaar/disputes/${disputeId}`,
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner) {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid API key required" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const status = url.searchParams.get("status");

  const sb = getSupabase();

  let query = sb
    .from("bazaar_disputes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Scope to authenticated owner — filter by filed_by
  query = query.eq("filed_by", owner.id);

  if (status) query = query.eq("status", status);

  const { data: disputes, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    disputes: disputes || [],
    total: count || 0,
    limit,
    offset,
  });
}
