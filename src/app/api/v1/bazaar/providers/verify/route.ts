import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";

/**
 * POST /api/v1/bazaar/providers/verify — Submit a verification request
 * Provider authenticates with their API key and requests a verification level.
 */
export async function POST(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Provider API key required" },
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

  const level = body.level as string;
  if (!level || !["email", "domain", "code"].includes(level)) {
    return NextResponse.json(
      {
        error: true,
        code: "VALIDATION_ERROR",
        message: "level required: email | domain | code",
      },
      { status: 422 }
    );
  }

  const sb = getSupabase();

  // Email verification: auto-approve if provider has email on record
  if (level === "email") {
    if (!owner.email) {
      return NextResponse.json(
        {
          error: true,
          code: "VERIFICATION_FAILED",
          message: "No email on record for this provider. Update your provider profile first.",
        },
        { status: 400 }
      );
    }

    const { error } = await sb
      .from("bazaar_providers")
      .update({
        verification_level: "email",
        verified_at: new Date().toISOString(),
        verification_metadata: {
          method: "email_on_record",
          email: owner.email,
          verified_at: new Date().toISOString(),
        },
      })
      .eq("id", owner.id);

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      provider_id: owner.id,
      verification_level: "email",
      verified_at: new Date().toISOString(),
      message: "Email verification complete. Your tools now display the 'email verified' badge.",
    });
  }

  // Domain verification: generate a DNS TXT record challenge
  if (level === "domain") {
    const domain = body.domain as string;
    if (!domain) {
      return NextResponse.json(
        {
          error: true,
          code: "VALIDATION_ERROR",
          message: "domain required for domain verification (e.g. 'example.com')",
        },
        { status: 422 }
      );
    }

    const challengeToken = `noui-verify-${owner.id.slice(0, 8)}-${Date.now().toString(36)}`;

    const { error } = await sb
      .from("bazaar_providers")
      .update({
        verification_metadata: {
          method: "dns_txt",
          domain,
          challenge_token: challengeToken,
          status: "pending",
          requested_at: new Date().toISOString(),
          instructions: `Add a DNS TXT record: _noui-verify.${domain} → ${challengeToken}`,
        },
      })
      .eq("id", owner.id);

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: false,
      provider_id: owner.id,
      verification_level: "pending_domain",
      challenge: {
        type: "dns_txt",
        record_name: `_noui-verify.${domain}`,
        record_value: challengeToken,
        instructions: `Add a TXT record for _noui-verify.${domain} with value: ${challengeToken}. Then call this endpoint again with level=domain and domain=${domain} to complete verification.`,
      },
    });
  }

  // Code verification: check GitHub repo reference
  if (level === "code") {
    const repoUrl = body.repo_url as string;
    if (!repoUrl) {
      return NextResponse.json(
        {
          error: true,
          code: "VALIDATION_ERROR",
          message: "repo_url required for code verification (e.g. 'https://github.com/org/repo')",
        },
        { status: 422 }
      );
    }

    const { error } = await sb
      .from("bazaar_providers")
      .update({
        verification_metadata: {
          method: "github_repo",
          repo_url: repoUrl,
          status: "pending_review",
          requested_at: new Date().toISOString(),
          instructions: "Add 'noui.bot' or your provider ID to your repo's README to complete verification.",
        },
      })
      .eq("id", owner.id);

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: false,
      provider_id: owner.id,
      verification_level: "pending_code",
      instructions: `Add a mention of noui.bot or your provider ID (${owner.id.slice(0, 8)}) to your repo README at ${repoUrl}. Verification will be reviewed within 24 hours.`,
    });
  }

  return NextResponse.json(
    { error: true, message: "Invalid verification level" },
    { status: 400 }
  );
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/bazaar/providers/verify",
    method: "POST",
    description: "Submit a verification request for your provider account.",
    auth: "Provider API key required (Bearer bz_...)",
    verification_levels: {
      email: "Auto-verified if email is on record. Instant.",
      domain: "Prove domain ownership via DNS TXT record. Returns challenge token.",
      code: "Prove code ownership via GitHub repo reference. Manual review within 24h.",
    },
    schema: {
      level: "string: email | domain | code (required)",
      domain: "string (required for domain verification)",
      repo_url: "string (required for code verification)",
    },
  });
}
