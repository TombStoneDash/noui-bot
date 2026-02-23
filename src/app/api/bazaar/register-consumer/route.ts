import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateBazaarKey } from "@/lib/bazaar-auth";

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bazaar/register-consumer",
    method: "POST",
    description: "Register as an agent developer. Get an API key to call tools through Bazaar.",
    schema: {
      name: "string (required) — your name or org",
      email: "string (required) — contact email",
      rate_limit_rpm: "number (optional) — requests per minute (default: 60)",
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

  if (!name || !email) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "name and email are required" },
      { status: 422 }
    );
  }

  const sb = getSupabase();
  const consumerKey = generateBazaarKey();

  const { data: consumer, error: consErr } = await sb
    .from("bazaar_consumers")
    .insert({
      name,
      email,
      rate_limit_rpm: (body.rate_limit_rpm as number) || 60,
      balance_cents: 0,
    })
    .select()
    .single();

  if (consErr) {
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: consErr.message },
      { status: 500 }
    );
  }

  // Create API key
  await sb.from("bazaar_api_keys").insert({
    key_hash: consumerKey.hash,
    key_prefix: consumerKey.prefix,
    owner_type: "consumer",
    owner_id: consumer.id,
    name: "Default Consumer Key",
    permissions: ["read", "call_tools"],
  });

  return NextResponse.json(
    {
      registered: true,
      consumer_id: consumer.id,
      name: consumer.name,
      api_key: consumerKey.key,
      api_key_prefix: consumerKey.prefix,
      balance: "$0.00",
      rate_limit_rpm: consumer.rate_limit_rpm,
      message: `${name} is registered! Save this API key — it won't be shown again.`,
      next_steps: {
        fund_balance: "Coming soon: Add funds via Stripe",
        browse_tools: "GET /api/bazaar/catalog",
        call_tool: "POST /api/bazaar/proxy { tool_id, input }",
        check_usage: "GET /api/bazaar/usage",
      },
    },
    { status: 201 }
  );
}
