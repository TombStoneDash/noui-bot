import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { generateReceiptId, signReceipt } from "@/lib/receipts";

const METER_STATUSES = ["success", "error", "timeout"];

/**
 * POST /api/v1/bazaar/meter — Record a tool invocation
 * Called by MCP server middleware to log metering data.
 * Requires provider or consumer API key.
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const invalid = (message: string) =>
    NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message },
      { status: 422 }
    );

  for (const field of ["tool_id", "tool_name", "agent_id", "status"]) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== "string") {
      return invalid(`${field} must be a string`);
    }
  }
  for (const field of ["duration_ms", "input_tokens", "output_tokens"]) {
    const value = body[field];
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
      return invalid(`${field} must be a non-negative number`);
    }
  }
  if (
    body.metadata !== undefined &&
    body.metadata !== null &&
    (typeof body.metadata !== "object" || Array.isArray(body.metadata))
  ) {
    return invalid("metadata must be an object");
  }

  const toolId = body.tool_id as string;
  const toolName = body.tool_name as string;
  const agentId = (body.agent_id as string) || owner.id;
  const status = (body.status as string) || "success";
  const durationMs = (body.duration_ms as number) || 0;
  const inputTokens = (body.input_tokens as number) || 0;
  const outputTokens = (body.output_tokens as number) || 0;
  const metadata = (body.metadata as object) || {};

  if (!toolId && !toolName) {
    return invalid("tool_id or tool_name required");
  }

  if (!METER_STATUSES.includes(status)) {
    return invalid(`status must be one of: ${METER_STATUSES.join(" | ")}`);
  }

  // A consumer key meters its own calls only. Without this, any consumer could
  // write usage and obtain a platform-signed receipt in another agent's name.
  if (owner.type === "consumer" && agentId !== owner.id) {
    return NextResponse.json(
      { error: true, code: "FORBIDDEN", message: "Consumer keys can only meter their own calls" },
      { status: 403 }
    );
  }

  const sb = getSupabase();

  // Look up the tool to get provider_id and pricing
  let toolQuery = sb.from("bazaar_tools")
    .select("id, provider_id, price_cents_override, bazaar_providers:provider_id (default_price_cents)")
    .eq("active", true);

  if (toolId) {
    toolQuery = toolQuery.eq("id", toolId);
  } else {
    toolQuery = toolQuery.eq("tool_name", toolName);
    // Tool names are only unique per provider, so a provider's lookup by name
    // must stay inside its own catalog.
    if (owner.type === "provider") toolQuery = toolQuery.eq("provider_id", owner.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tool } = await toolQuery.single() as { data: any };

  if (owner.type === "provider" && tool && tool.provider_id !== owner.id) {
    return NextResponse.json(
      { error: true, code: "FORBIDDEN", message: "Provider keys can only meter their own tools" },
      { status: 403 }
    );
  }

  const resolvedToolId = tool?.id || toolId || "unknown";
  const providerId = tool?.provider_id || (owner.type === "provider" ? owner.id : "unknown");
  const priceCents = tool?.price_cents_override ?? tool?.bazaar_providers?.default_price_cents ?? 0;

  // Record the invocation
  const { error: insertErr } = await sb.from("bazaar_usage_logs").insert({
    consumer_id: agentId,
    provider_id: providerId,
    tool_id: resolvedToolId,
    status,
    cost_cents: status === "success" ? priceCents : 0,
    latency_ms: durationMs,
    request_size_bytes: inputTokens,
    response_size_bytes: outputTokens,
    metadata: {
      ...metadata,
      source: "meter_api",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  });

  if (insertErr) {
    return NextResponse.json(
      { error: true, message: insertErr.message },
      { status: 500 }
    );
  }

  // Generate signed receipt
  const now = new Date().toISOString();
  const costMicrocents = (status === "success" ? priceCents : 0) * 10_000;
  const receiptId = generateReceiptId();
  const signature = signReceipt({
    receipt_id: receiptId,
    tool_id: resolvedToolId,
    agent_id: agentId,
    provider_id: providerId,
    timestamp: now,
    cost_microcents: costMicrocents,
    status,
  });

  // Store the receipt
  const { error: receiptErr } = await sb.from("bazaar_receipts").insert({
    receipt_id: receiptId,
    tool_id: resolvedToolId,
    tool_name: toolName || null,
    agent_id: agentId,
    provider_id: providerId,
    timestamp: now,
    duration_ms: durationMs,
    cost_microcents: costMicrocents,
    status,
    input_hash: inputTokens ? String(inputTokens) : null,
    output_hash: outputTokens ? String(outputTokens) : null,
    signature,
    metadata: {
      ...metadata,
      source: "meter_api",
    },
  });

  if (receiptErr) {
    console.error("[METER] Receipt creation failed:", receiptErr.message);
    // Don't fail the meter call if receipt fails — metering is primary
  }

  return NextResponse.json({
    metered: true,
    tool_id: resolvedToolId,
    agent_id: agentId,
    cost_microcents: costMicrocents,
    cost_cents: priceCents,
    status,
    timestamp: now,
    receipt: {
      receipt_id: receiptId,
      signature,
      verify_url: `https://noui.bot/api/v1/bazaar/receipts/${receiptId}`,
    },
  }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/bazaar/meter",
    method: "POST",
    description: "Record a tool invocation. Called by MCP server middleware.",
    schema: {
      tool_id: "string (required if no tool_name)",
      tool_name: "string (required if no tool_id)",
      agent_id: "string (optional, defaults to authenticated key owner)",
      status: "string: success | error | timeout (default: success)",
      duration_ms: "number (optional)",
      input_tokens: "number (optional)",
      output_tokens: "number (optional)",
      metadata: "object (optional)",
    },
  });
}
