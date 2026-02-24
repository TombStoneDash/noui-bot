import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";

export async function POST(request: Request) {
  // 1. Authenticate consumer
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "consumer") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid consumer API key required" },
      { status: 401 }
    );
  }

  // 2. Parse request
  let body: Record<string, unknown>;
  let rawBody: string;
  try {
    rawBody = await request.text();
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const requestSizeBytes = new TextEncoder().encode(rawBody).length;

  const toolId = body.tool_id as string;
  const toolName = body.tool_name as string;
  const input = body.input as Record<string, unknown>;

  if ((!toolId && !toolName) || !input) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "tool_id (or tool_name) and input are required" },
      { status: 422 }
    );
  }

  const sb = getSupabase();
  const startTime = Date.now();

  // 2b. Rate limiting — check RPM for this consumer
  const rpm = owner.rate_limit_rpm || 60;
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCalls } = await sb
    .from("bazaar_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("consumer_id", owner.id)
    .gte("created_at", oneMinuteAgo);

  if ((recentCalls ?? 0) >= rpm) {
    await sb.from("bazaar_usage_logs").insert({
      consumer_id: owner.id,
      provider_id: "00000000-0000-0000-0000-000000000000",
      tool_id: "00000000-0000-0000-0000-000000000000",
      status: "rate_limited",
      cost_cents: 0,
      latency_ms: Date.now() - startTime,
      request_size_bytes: requestSizeBytes,
    });

    return NextResponse.json(
      {
        error: true,
        code: "RATE_LIMITED",
        message: `Rate limit exceeded. Limit: ${rpm} requests/minute`,
        retry_after_seconds: 60,
      },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 3. Look up tool
  let toolQuery = sb
    .from("bazaar_tools")
    .select(`
      *,
      bazaar_providers:provider_id (
        id, name, endpoint_url, pricing_model, default_price_cents, active
      )
    `)
    .eq("active", true);

  if (toolId) {
    toolQuery = toolQuery.eq("id", toolId);
  } else {
    toolQuery = toolQuery.eq("tool_name", toolName);
  }

  const { data: tool, error: toolErr } = await toolQuery.single();

  if (toolErr || !tool) {
    return NextResponse.json(
      { error: true, code: "NOT_FOUND", message: "Tool not found or inactive" },
      { status: 404 }
    );
  }

  const provider = tool.bazaar_providers as any;
  if (!provider?.active) {
    return NextResponse.json(
      { error: true, code: "UNAVAILABLE", message: "Provider is inactive" },
      { status: 503 }
    );
  }

  // 4. Calculate cost
  const priceCents = tool.price_cents_override ?? provider.default_price_cents ?? 0;
  const pricingModel = tool.pricing_model_override ?? provider.pricing_model ?? "per_call";

  // 5. Check balance (skip for free tools)
  if (priceCents > 0 && (owner.balance_cents ?? 0) < priceCents) {
    // Log the failed attempt
    await sb.from("bazaar_usage_logs").insert({
      consumer_id: owner.id,
      provider_id: provider.id,
      tool_id: tool.id,
      status: "insufficient_funds",
      cost_cents: 0,
      latency_ms: Date.now() - startTime,
      request_size_bytes: requestSizeBytes,
    });

    return NextResponse.json(
      {
        error: true,
        code: "INSUFFICIENT_FUNDS",
        message: `Insufficient balance. Cost: $${(priceCents / 100).toFixed(4)}, Balance: $${((owner.balance_cents ?? 0) / 100).toFixed(2)}`,
        cost_cents: priceCents,
        balance_cents: owner.balance_cents,
      },
      { status: 402 }
    );
  }

  // 6. Forward request to provider's MCP endpoint
  let mcpResponse: any;
  let mcpResponseRaw = "";
  let status = "success";
  let errorMessage: string | null = null;

  const mcpRequestBody = JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: tool.tool_name,
      arguments: input,
    },
    id: crypto.randomUUID(),
  });

  try {
    const mcpResult = await fetch(provider.endpoint_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bazaar-Consumer": owner.id,
        "X-Bazaar-Tool": tool.tool_name,
      },
      body: mcpRequestBody,
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    mcpResponseRaw = await mcpResult.text();

    if (!mcpResult.ok) {
      status = "error";
      errorMessage = `Provider returned ${mcpResult.status}`;
      mcpResponse = { error: errorMessage };
    } else {
      mcpResponse = JSON.parse(mcpResponseRaw);
    }
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      status = "timeout";
      errorMessage = "Provider request timed out (30s)";
    } else if (err instanceof SyntaxError) {
      status = "error";
      errorMessage = "Provider returned invalid JSON";
    } else {
      status = "error";
      errorMessage = err.message || "Unknown error";
    }
    mcpResponse = mcpResponse || { error: errorMessage };
  }

  const latencyMs = Date.now() - startTime;
  const responseSizeBytes = new TextEncoder().encode(mcpResponseRaw).length;

  // 7. Debit consumer balance (only for successful calls with cost)
  const actualCost = status === "success" ? priceCents : 0;

  if (actualCost > 0) {
    await sb
      .from("bazaar_consumers")
      .update({
        balance_cents: (owner.balance_cents ?? 0) - actualCost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", owner.id);
  }

  // 8. Log usage (with data volume tracking)
  await sb.from("bazaar_usage_logs").insert({
    consumer_id: owner.id,
    provider_id: provider.id,
    tool_id: tool.id,
    status,
    cost_cents: actualCost,
    latency_ms: latencyMs,
    error_message: errorMessage,
    request_size_bytes: requestSizeBytes,
    response_size_bytes: responseSizeBytes,
    metadata: { pricing_model: pricingModel },
  });

  // 9. Update tool stats
  await sb
    .from("bazaar_tools")
    .update({
      call_count: (tool.call_count || 0) + 1,
      avg_latency_ms: tool.avg_latency_ms
        ? Math.round((tool.avg_latency_ms + latencyMs) / 2)
        : latencyMs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tool.id);

  // 10. Return response
  if (status !== "success") {
    return NextResponse.json(
      {
        error: true,
        code: status === "timeout" ? "TIMEOUT" : "PROVIDER_ERROR",
        message: errorMessage,
        tool: tool.tool_name,
        provider: provider.name,
        latency_ms: latencyMs,
        cost_cents: actualCost,
      },
      { status: status === "timeout" ? 504 : 502 }
    );
  }

  return NextResponse.json({
    result: mcpResponse.result || mcpResponse,
    meta: {
      tool: tool.tool_name,
      provider: provider.name,
      cost_cents: actualCost,
      cost: actualCost === 0 ? "Free" : `$${(actualCost / 100).toFixed(4)}`,
      latency_ms: latencyMs,
      remaining_balance_cents: (owner.balance_cents ?? 0) - actualCost,
    },
  });
}
