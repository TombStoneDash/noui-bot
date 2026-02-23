import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateBazaarKey } from "@/lib/bazaar-auth";
import { createHash } from "crypto";

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bazaar/register-provider",
    method: "POST",
    description: "Register your MCP server. Set pricing, get an API key, start earning.",
    schema: {
      name: "string (required) — your MCP server name",
      email: "string (required) — contact email",
      endpoint_url: "string (required) — your MCP server URL",
      description: "string (optional)",
      pricing_model: "string (optional) — per_call | per_token | flat_monthly | free (default: per_call)",
      default_price_cents: "number (optional) — price per call in cents (default: 0)",
      tools: "array (optional) — list of tools to register: [{ tool_name, description, category, price_cents_override }]",
    },
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const name = (body.name as string)?.trim();
  const email = (body.email as string)?.trim();
  const endpointUrl = (body.endpoint_url as string)?.trim();

  if (!name || !email || !endpointUrl) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "name, email, and endpoint_url are required" },
      { status: 422 }
    );
  }

  const sb = getSupabase();
  const providerKey = generateBazaarKey();

  // Create provider
  const { data: provider, error: provErr } = await sb
    .from("bazaar_providers")
    .insert({
      name,
      email,
      endpoint_url: endpointUrl,
      description: (body.description as string) || null,
      pricing_model: (body.pricing_model as string) || "per_call",
      default_price_cents: (body.default_price_cents as number) || 0,
      api_key_hash: providerKey.hash,
      api_key_prefix: providerKey.prefix,
    })
    .select()
    .single();

  if (provErr) {
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: provErr.message },
      { status: 500 }
    );
  }

  // Create the API key record
  await sb.from("bazaar_api_keys").insert({
    key_hash: providerKey.hash,
    key_prefix: providerKey.prefix,
    owner_type: "provider",
    owner_id: provider.id,
    name: "Default Provider Key",
    permissions: ["read", "write", "manage_tools"],
  });

  // Register tools if provided
  const tools = (body.tools as Array<Record<string, unknown>>) || [];
  const registeredTools = [];

  for (const tool of tools) {
    const { data: t } = await sb
      .from("bazaar_tools")
      .insert({
        provider_id: provider.id,
        tool_name: (tool.tool_name as string) || "",
        display_name: (tool.display_name as string) || null,
        description: (tool.description as string) || null,
        category: (tool.category as string) || "other",
        price_cents_override: (tool.price_cents_override as number) || null,
        input_schema: (tool.input_schema as object) || null,
      })
      .select()
      .single();

    if (t) registeredTools.push({ id: t.id, tool_name: t.tool_name });
  }

  return NextResponse.json(
    {
      registered: true,
      provider_id: provider.id,
      name: provider.name,
      api_key: providerKey.key,
      api_key_prefix: providerKey.prefix,
      tools_registered: registeredTools.length,
      tools: registeredTools,
      message: `${name} is registered! Save this API key — it won't be shown again.`,
      next_steps: {
        add_tools: "Register individual tools with tool_name, description, pricing",
        view_catalog: "GET /api/bazaar/catalog",
        check_usage: "GET /api/bazaar/usage (Authorization: Bearer bz_...)",
      },
    },
    { status: 201 }
  );
}
