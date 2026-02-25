import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bazaar/tools",
    method: "POST",
    description: "Register tools for your provider. Requires provider API key.",
    schema: {
      tools: "[{ tool_name, description, category, price_cents_override, input_schema }]",
    },
    categories: ["weather", "search", "code", "data", "comms", "finance", "utility", "other"],
  });
}

export async function POST(request: Request) {
  // Authenticate provider
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required (Authorization: Bearer bz_...)" },
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

  const tools = body.tools as Array<Record<string, unknown>>;
  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "tools array is required and must not be empty" },
      { status: 422 }
    );
  }

  if (tools.length > 50) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "Maximum 50 tools per request" },
      { status: 422 }
    );
  }

  const sb = getSupabase();
  const registered = [];
  const errors = [];

  for (const tool of tools) {
    const toolName = (tool.tool_name as string)?.trim();
    if (!toolName) {
      errors.push({ tool_name: tool.tool_name, error: "tool_name is required" });
      continue;
    }

    // Check for duplicate tool name under this provider
    const { data: existing } = await sb
      .from("bazaar_tools")
      .select("id")
      .eq("provider_id", owner.id)
      .eq("tool_name", toolName)
      .single();

    if (existing) {
      // Update existing tool instead of failing
      const { data: updated, error: updErr } = await sb
        .from("bazaar_tools")
        .update({
          description: (tool.description as string) || undefined,
          category: (tool.category as string) || undefined,
          price_cents_override: tool.price_cents_override !== undefined ? (tool.price_cents_override as number) : undefined,
          input_schema: tool.input_schema || undefined,
          display_name: (tool.display_name as string) || undefined,
          active: true,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updErr) {
        errors.push({ tool_name: toolName, error: updErr.message });
      } else if (updated) {
        registered.push({ id: updated.id, tool_name: updated.tool_name, action: "updated" });
      }
      continue;
    }

    const priceCents = (tool.price_cents_override as number) ?? null;
    if (priceCents !== null && priceCents < 0) {
      errors.push({ tool_name: toolName, error: "price_cents_override must be >= 0" });
      continue;
    }

    const { data: t, error: insErr } = await sb
      .from("bazaar_tools")
      .insert({
        provider_id: owner.id,
        tool_name: toolName,
        display_name: (tool.display_name as string) || null,
        description: (tool.description as string) || null,
        category: (tool.category as string) || "other",
        price_cents_override: priceCents,
        input_schema: (tool.input_schema as object) || null,
        endpoint_path: (tool.endpoint_path as string) || null,
        active: true,
      })
      .select()
      .single();

    if (insErr) {
      errors.push({ tool_name: toolName, error: insErr.message });
    } else if (t) {
      registered.push({ id: t.id, tool_name: t.tool_name, action: "created" });
    }
  }

  return NextResponse.json(
    {
      registered: registered.length,
      errors: errors.length,
      tools: registered,
      ...(errors.length > 0 ? { tool_errors: errors } : {}),
      message: `${registered.length} tool(s) registered, ${errors.length} error(s).`,
    },
    { status: registered.length > 0 ? 201 : 422 }
  );
}
