import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { parsePagination } from "@/lib/pagination";
import { generateDisputeId } from "@/lib/receipts";

const VALID_REASONS = ["tool_error", "overcharge", "timeout", "quality", "other"];
const VALID_STATUSES = ["filed", "under_review", "resolved_refund", "resolved_denied", "resolved_credit"];
const RECEIPT_ID = /^rcpt_[0-9a-f]{16,}$/;
const MAX_DESCRIPTION_CHARS = 5_000;
const MAX_EVIDENCE_BYTES = 16_384;
// PostgREST reports "no rows" from .single() with this code.
const NO_ROWS = "PGRST116";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unavailable(what: string, err: { message?: string } | null) {
  console.error(`[disputes] ${what} failed:`, err?.message);
  return NextResponse.json(
    { error: true, code: "SERVICE_UNAVAILABLE", message: "Disputes are temporarily unavailable; nothing was filed" },
    { status: 503 }
  );
}

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }
  if (!isPlainObject(body)) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const invalid = (message: string) =>
    NextResponse.json({ error: true, code: "VALIDATION_ERROR", message }, { status: 422 });

  const receiptId = body.receipt_id;
  const reason = body.reason;
  const description = body.description ?? null;
  const evidence = body.evidence ?? {};

  if (typeof receiptId !== "string" || !receiptId) {
    return invalid("receipt_id required");
  }
  if (typeof reason !== "string" || !VALID_REASONS.includes(reason)) {
    return invalid(`reason required: ${VALID_REASONS.join(" | ")}`);
  }
  if (description !== null && (typeof description !== "string" || description.length > MAX_DESCRIPTION_CHARS)) {
    return invalid(`description must be a string of at most ${MAX_DESCRIPTION_CHARS} characters`);
  }
  if (!isPlainObject(evidence) || new TextEncoder().encode(JSON.stringify(evidence)).length > MAX_EVIDENCE_BYTES) {
    return invalid(`evidence must be a JSON object of at most ${MAX_EVIDENCE_BYTES} bytes`);
  }
  // Receipt IDs are rcpt_ + hex; anything else cannot exist.
  if (!RECEIPT_ID.test(receiptId)) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: `Receipt ${receiptId.slice(0, 64)} not found` },
      { status: 404 }
    );
  }

  const sb = getSupabase();

  // Verify the receipt exists and belongs to this user
  const { data: receipt, error: receiptErr } = await sb
    .from("bazaar_receipts")
    .select("*")
    .eq("receipt_id", receiptId)
    .single();

  if (receiptErr && receiptErr.code !== NO_ROWS) return unavailable("receipt lookup", receiptErr);
  if (!receipt) {
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
  // If this check cannot run, refuse rather than risk a duplicate dispute.
  const { data: existing, error: existingErr } = await sb
    .from("bazaar_disputes")
    .select("dispute_id")
    .eq("receipt_id", receiptId)
    .not("status", "in", '("resolved_denied")')
    .limit(1);
  if (existingErr) return unavailable("duplicate check", existingErr);

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
    description: description?.trim() || null,
    evidence,
    status: "filed",
  });

  if (insertErr) return unavailable("insert", insertErr);

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
  const page = parsePagination(url.searchParams, { defaultLimit: 50, maxLimit: 100 });
  if ("error" in page) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: page.error },
      { status: 400 }
    );
  }
  const { limit, offset } = page;
  const status = url.searchParams.get("status");
  if (status !== null && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: `status must be one of: ${VALID_STATUSES.join(" | ")}` },
      { status: 400 }
    );
  }

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
    console.error("[disputes] list failed:", error.message);
    return NextResponse.json(
      { error: true, code: "SERVICE_UNAVAILABLE", message: "Disputes are temporarily unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    disputes: disputes || [],
    total: count || 0,
    limit,
    offset,
  });
}
