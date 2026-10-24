import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { isPriceCents } from "@/lib/price-cents";

const MAX_TOOL_NAME_LENGTH = 200;
const PRICE_ERROR = "price_cents_override must be a non-negative integer or null";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

type ToolFields = {
  displayName?: string;
  description?: string;
  category?: string;
  inputSchema?: Record<string, unknown>;
  /** undefined = not sent (leave unchanged on update); null = use the provider default */
  priceCents?: number | null;
  freeTierCalls?: number;
};

/** Validate the optional tool fields. Returns an error message, or the typed fields. */
function parseToolFields(tool: Record<string, unknown>): ToolFields | string {
  for (const key of ["display_name", "description", "category"]) {
    if (tool[key] != null && typeof tool[key] !== "string") return `${key} must be a string`;
  }
  if (tool.input_schema != null && !isPlainObject(tool.input_schema)) return "input_schema must be a JSON object";
  if (tool.pricing != null && !isPlainObject(tool.pricing)) return "pricing must be an object";
  const pricing = (tool.pricing ?? {}) as Record<string, unknown>;

  // price_cents_override wins; pricing.price_cents is the documented alternative. Both paths apply on update too.
  const override = tool.price_cents_override;
  const priceCents = override != null ? override : pricing.price_cents != null ? pricing.price_cents : override;
  if (priceCents != null && !isPriceCents(priceCents)) return PRICE_ERROR;

  const freeTierCalls = pricing.free_tier_calls;
  if (freeTierCalls != null && !isPriceCents(freeTierCalls)) return "pricing.free_tier_calls must be a non-negative integer";

  return {
    displayName: (tool.display_name as string | null | undefined) ?? undefined,
    description: (tool.description as string | null | undefined) ?? undefined,
    category: (tool.category as string | null | undefined) ?? undefined,
    inputSchema: (tool.input_schema as Record<string, unknown> | null | undefined) ?? undefined,
    priceCents: priceCents as number | null | undefined,
    freeTierCalls: (freeTierCalls as number | null | undefined) ?? undefined,
  };
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bazaar/tools",
    method: "POST",
    description: "Register tools for your provider. Requires provider API key.",
    schema: {
      tools: "[{ tool_name, display_name, description, category, price_cents_override, pricing: { price_cents, free_tier_calls }, input_schema }] — up to 50; re-sending a tool_name updates only the fields sent",
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

  const tools = body.tools;
  if (!Array.isArray(tools) || tools.length === 0) {
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
    if (!isPlainObject(tool)) {
      errors.push({ tool_name: null, error: "each tool must be an object" });
      continue;
    }

    const toolName = typeof tool.tool_name === "string" ? tool.tool_name.trim() : "";
    if (!toolName || toolName.length > MAX_TOOL_NAME_LENGTH) {
      errors.push({ tool_name: tool.tool_name ?? null, error: `tool_name must be a non-empty string of at most ${MAX_TOOL_NAME_LENGTH} characters` });
      continue;
    }

    const fields = parseToolFields(tool);
    if (typeof fields === "string") {
      errors.push({ tool_name: toolName, error: fields });
      continue;
    }

    // Check for duplicate tool name under this provider
    const { data: existing, error: lookupErr } = await sb
      .from("bazaar_tools")
      .select("id")
      .eq("provider_id", owner.id)
      .eq("tool_name", toolName)
      .maybeSingle();

    if (lookupErr) {
      // Inserting blind could duplicate a tool the lookup failed to see.
      console.error("[bazaar/tools] tool lookup failed:", toolName, lookupErr.message);
      errors.push({ tool_name: toolName, error: "tool could not be saved; retry later" });
      continue;
    }

    if (existing) {
      // Update existing tool instead of failing; fields that were not sent stay unchanged.
      const { data: updated, error: updErr } = await sb
        .from("bazaar_tools")
        .update({
          description: fields.description || undefined,
          category: fields.category || undefined,
          price_cents_override: fields.priceCents,
          free_tier_calls: fields.freeTierCalls,
          input_schema: fields.inputSchema || undefined,
          display_name: fields.displayName || undefined,
          active: true,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updErr || !updated) {
        console.error("[bazaar/tools] tool update failed:", toolName, updErr?.message);
        errors.push({ tool_name: toolName, error: "tool could not be saved; retry later" });
      } else {
        registered.push({ id: updated.id, tool_name: updated.tool_name, action: "updated" });
      }
      continue;
    }

    const { data: t, error: insErr } = await sb
      .from("bazaar_tools")
      .insert({
        provider_id: owner.id,
        tool_name: toolName,
        display_name: fields.displayName || null,
        description: fields.description || null,
        category: fields.category || "other",
        price_cents_override: fields.priceCents ?? null,
        input_schema: fields.inputSchema ?? null,
        free_tier_calls: fields.freeTierCalls ?? 0,
        active: true,
      })
      .select()
      .single();

    if (insErr || !t) {
      console.error("[bazaar/tools] tool insert failed:", toolName, insErr?.message);
      errors.push({ tool_name: toolName, error: "tool could not be saved; retry later" });
    } else {
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
