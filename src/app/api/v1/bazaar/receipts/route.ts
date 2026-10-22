import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { parsePagination } from "@/lib/pagination";

/**
 * GET /api/v1/bazaar/receipts — List receipts
 * Filtered by agent_id or provider_id (from auth or query params)
 */
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
  const toolId = url.searchParams.get("tool_id");
  const status = url.searchParams.get("status");

  const sb = getSupabase();

  let query = sb
    .from("bazaar_receipts")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  // Scope to authenticated owner
  if (owner.type === "consumer") {
    query = query.eq("agent_id", owner.id);
  } else {
    query = query.eq("provider_id", owner.id);
  }

  if (toolId) query = query.eq("tool_id", toolId);
  if (status) query = query.eq("status", status);

  const { data: receipts, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    receipts: receipts || [],
    total: count || 0,
    limit,
    offset,
  });
}
