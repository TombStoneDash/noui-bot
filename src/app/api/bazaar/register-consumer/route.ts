import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateBazaarKey } from "@/lib/bazaar-auth";

const FREE_PLAN_RPM = 60;
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const VALID_EMAIL = /^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bazaar/register-consumer",
    method: "POST",
    description: "Register as an agent developer. Get an API key to call tools through Bazaar.",
    schema: {
      name: `string (required) — your name or org, at most ${MAX_NAME_LENGTH} characters`,
      email: "string (required) — a valid contact email",
      rate_limit_rpm: "integer (optional) — requests per minute, 1-60 (default: 60); higher limits come with a paid plan",
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

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!name || !email) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "name and email are required strings" },
      { status: 422 }
    );
  }

  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: `name must be at most ${MAX_NAME_LENGTH} characters` },
      { status: 422 }
    );
  }

  if (email.length > MAX_EMAIL_LENGTH || !VALID_EMAIL.test(email)) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: "email must be a valid email address" },
      { status: 422 }
    );
  }

  // Self-registration gets at most the free plan's limit; pro/scale limits are set by the subscription webhook.
  const rateLimitRpm = body.rate_limit_rpm ?? FREE_PLAN_RPM;
  if (typeof rateLimitRpm !== "number" || !Number.isInteger(rateLimitRpm) || rateLimitRpm < 1 || rateLimitRpm > FREE_PLAN_RPM) {
    return NextResponse.json(
      { error: true, code: "VALIDATION_ERROR", message: `rate_limit_rpm must be an integer between 1 and ${FREE_PLAN_RPM}` },
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
      rate_limit_rpm: rateLimitRpm,
      balance_cents: 0,
    })
    .select()
    .single();

  if (consErr || !consumer) {
    // Database errors can name tables, constraints and columns; keep them server-side.
    console.error("[register-consumer] consumer insert failed:", consErr?.message);
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: "Consumer could not be registered" },
      { status: 500 }
    );
  }

  // Create API key
  const { error: keyErr } = await sb.from("bazaar_api_keys").insert({
    key_hash: consumerKey.hash,
    key_prefix: consumerKey.prefix,
    owner_type: "consumer",
    owner_id: consumer.id,
    name: "Default Consumer Key",
    permissions: ["read", "call_tools"],
  });

  if (keyErr) {
    // Without a key the account is unreachable; remove it so a retry starts clean.
    console.error("[register-consumer] API key insert failed:", keyErr.message);
    const { error: cleanupErr } = await sb.from("bazaar_consumers").delete().eq("id", consumer.id);
    if (cleanupErr) {
      console.error("[register-consumer] orphaned consumer cleanup failed:", consumer.id, cleanupErr.message);
    }
    return NextResponse.json(
      { error: true, code: "INTERNAL_ERROR", message: "API key could not be created" },
      { status: 500 }
    );
  }

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
