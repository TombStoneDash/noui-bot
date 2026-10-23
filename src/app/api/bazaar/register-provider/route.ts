import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateBazaarKey } from "@/lib/bazaar-auth";
import { isPriceCents } from "@/lib/price-cents";

const PRICING_MODELS = ["per_call", "per_token", "flat_monthly", "free"];
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_URL_LENGTH = 2048;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TOOL_NAME_LENGTH = 200;
const MAX_TOOLS = 100;
const VALID_EMAIL = /^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

function validationError(message: string) {
  return NextResponse.json({ error: true, code: "VALIDATION_ERROR", message }, { status: 422 });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === "string" ? value : undefined;
}

/** The proxy forwards paid calls to this URL, so it must be an absolute http(s) URL without credentials. */
function isEndpointUrl(value: string): boolean {
  if (value.length > MAX_URL_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password && Boolean(url.hostname);
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bazaar/register-provider",
    method: "POST",
    description: "Register your MCP server. Set pricing, get an API key, start earning.",
    schema: {
      name: `string (required) — your MCP server name, at most ${MAX_NAME_LENGTH} characters`,
      email: "string (required) — a valid contact email",
      endpoint_url: "string (required) — your MCP server's http(s) URL",
      description: `string (optional) — at most ${MAX_DESCRIPTION_LENGTH} characters`,
      pricing_model: "string (optional) — per_call | per_token | flat_monthly | free (default: per_call)",
      default_price_cents: "integer (optional) — price per call in cents, >= 0 (default: 0)",
      tools: `array (optional) — up to ${MAX_TOOLS} tools to register: [{ tool_name, description, category, price_cents_override }]`,
    },
  });
}

export async function POST(request: Request) {
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const endpointUrl = typeof body.endpoint_url === "string" ? body.endpoint_url.trim() : "";

  if (!name || !email || !endpointUrl) {
    return validationError("name, email, and endpoint_url are required strings");
  }
  if (name.length > MAX_NAME_LENGTH) {
    return validationError(`name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  if (email.length > MAX_EMAIL_LENGTH || !VALID_EMAIL.test(email)) {
    return validationError("email must be a valid email address");
  }
  if (!isEndpointUrl(endpointUrl)) {
    return validationError("endpoint_url must be an absolute http(s) URL without credentials");
  }

  const description = optionalString(body.description);
  if (description === undefined || (description && description.length > MAX_DESCRIPTION_LENGTH)) {
    return validationError(`description must be a string of at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  const pricingModel = body.pricing_model ?? "per_call";
  if (typeof pricingModel !== "string" || !PRICING_MODELS.includes(pricingModel)) {
    return validationError(`pricing_model must be one of: ${PRICING_MODELS.join(", ")}`);
  }

  const defaultPriceCents = body.default_price_cents ?? 0;
  if (!isPriceCents(defaultPriceCents)) {
    return validationError("default_price_cents must be a non-negative integer");
  }

  const rawTools = body.tools ?? [];
  if (!Array.isArray(rawTools) || rawTools.length > MAX_TOOLS) {
    return validationError(`tools must be an array of at most ${MAX_TOOLS} tool objects`);
  }
  const seenToolNames = new Set<string>();
  for (const [index, tool] of rawTools.entries()) {
    const toolName = isPlainObject(tool) && typeof tool.tool_name === "string" ? tool.tool_name.trim() : "";
    if (!toolName || toolName.length > MAX_TOOL_NAME_LENGTH) {
      return validationError(`tools[${index}].tool_name must be a non-empty string of at most ${MAX_TOOL_NAME_LENGTH} characters`);
    }
    if (seenToolNames.has(toolName)) {
      return validationError(`tools[${index}].tool_name "${toolName}" is listed more than once`);
    }
    seenToolNames.add(toolName);
  }
  const tools = rawTools as Array<Record<string, unknown>>;
  const badTool = tools.find((tool) => tool.price_cents_override != null && !isPriceCents(tool.price_cents_override));
  if (badTool) {
    return validationError(`price_cents_override for ${String(badTool.tool_name)} must be a non-negative integer or null`);
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
      description: description || null,
      pricing_model: pricingModel,
      default_price_cents: defaultPriceCents,
      api_key_hash: providerKey.hash,
      api_key_prefix: providerKey.prefix,
    })
    .select()
    .single();

  if (provErr || !provider) {
    // Database errors can name tables, constraints and columns; keep them server-side.
    console.error("[register-provider] provider insert failed:", provErr?.message);
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: "Provider could not be registered" },
      { status: 500 }
    );
  }

  // Create the API key record. Authentication reads this table, so without it the key we return is dead.
  const { error: keyErr } = await sb.from("bazaar_api_keys").insert({
    key_hash: providerKey.hash,
    key_prefix: providerKey.prefix,
    owner_type: "provider",
    owner_id: provider.id,
    name: "Default Provider Key",
    permissions: ["read", "write", "manage_tools"],
  });

  if (keyErr) {
    // Remove the unreachable provider so a retry starts clean.
    console.error("[register-provider] API key insert failed:", keyErr.message);
    const { error: cleanupErr } = await sb.from("bazaar_providers").delete().eq("id", provider.id);
    if (cleanupErr) {
      console.error("[register-provider] orphaned provider cleanup failed:", provider.id, cleanupErr.message);
    }
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: "Provider could not be registered" },
      { status: 500 }
    );
  }

  // Register tools if provided
  const registeredTools = [];
  const failedTools = [];

  for (const tool of tools) {
    const toolName = (tool.tool_name as string).trim();
    const { data: t, error: toolErr } = await sb
      .from("bazaar_tools")
      .insert({
        provider_id: provider.id,
        tool_name: toolName,
        display_name: optionalString(tool.display_name) || null,
        description: optionalString(tool.description) || null,
        category: optionalString(tool.category) || "other",
        // ?? keeps an explicit 0 (a free tool) instead of falling back to the provider default
        price_cents_override: (tool.price_cents_override as number | null | undefined) ?? null,
        input_schema: isPlainObject(tool.input_schema) ? tool.input_schema : null,
      })
      .select()
      .single();

    if (t && !toolErr) {
      registeredTools.push({ id: t.id, tool_name: t.tool_name });
    } else {
      console.error("[register-provider] tool insert failed:", toolName, toolErr?.message);
      failedTools.push(toolName);
    }
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
      ...(failedTools.length > 0 && {
        tools_failed: failedTools,
        warning: "Some tools could not be registered. Retry them with POST /api/bazaar/tools.",
      }),
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
