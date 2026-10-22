import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey } from "@/lib/bazaar-auth";
import { randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

const LEVEL_RANK: Record<string, number> = { unverified: 0, email: 1, domain: 2, code: 3 };
const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/** Lower-case hostname without a trailing dot, or null if it is not a valid hostname. */
function normalizeDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  return HOSTNAME_RE.test(domain) ? domain : null;
}

/** TXT records at a name, each record's chunks joined. Missing names yield []. */
async function lookupTxt(name: string): Promise<string[]> {
  try {
    return (await resolveTxt(name)).map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST", message: "Request body must be a JSON object" },
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

  // Domain verification: issue a DNS TXT challenge, then confirm it on the next call
  if (level === "domain") {
    const domain = normalizeDomain(body.domain);
    if (!domain) {
      return NextResponse.json(
        {
          error: true,
          code: "VALIDATION_ERROR",
          message: "domain required for domain verification: a hostname such as 'example.com'",
        },
        { status: 422 }
      );
    }

    const { data: current, error: readError } = await sb
      .from("bazaar_providers")
      .select("verification_level, verification_metadata")
      .eq("id", owner.id)
      .single();

    if (readError) {
      return NextResponse.json(
        { error: true, message: readError.message },
        { status: 500 }
      );
    }

    const recordName = `_noui-verify.${domain}`;
    const pending = current?.verification_metadata as Record<string, unknown> | null;

    // A pending challenge for this domain: check DNS instead of issuing a new
    // token, which would invalidate the record the provider just published.
    if (pending?.method === "dns_txt" && pending.domain === domain &&
        pending.status === "pending" && typeof pending.challenge_token === "string") {
      const challengeToken = pending.challenge_token;
      const challenge = {
        type: "dns_txt",
        record_name: recordName,
        record_value: challengeToken,
        instructions: `Add a TXT record for ${recordName} with value: ${challengeToken}. Then call this endpoint again with level=domain and domain=${domain} to complete verification.`,
      };

      const records = await lookupTxt(recordName);
      if (!records.includes(challengeToken)) {
        return NextResponse.json({
          verified: false,
          provider_id: owner.id,
          verification_level: "pending_domain",
          message: `TXT record not found yet at ${recordName}. DNS changes can take a few minutes to propagate.`,
          challenge,
        });
      }

      const verifiedAt = new Date().toISOString();
      const currentLevel = (current?.verification_level as string) || "unverified";
      // Never downgrade a stronger level (code review outranks domain).
      const nextLevel = (LEVEL_RANK[currentLevel] ?? 0) > LEVEL_RANK.domain ? currentLevel : "domain";
      const { error } = await sb
        .from("bazaar_providers")
        .update({
          verification_level: nextLevel,
          verified_at: verifiedAt,
          verification_metadata: {
            ...pending,
            status: "verified",
            verified_at: verifiedAt,
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
        verification_level: nextLevel,
        domain,
        verified_at: verifiedAt,
        message: `Domain ${domain} verified. You can remove the ${recordName} TXT record.`,
      });
    }

    const challengeToken = `noui-verify-${owner.id.slice(0, 8)}-${randomUUID()}`;

    const { error } = await sb
      .from("bazaar_providers")
      .update({
        verification_metadata: {
          method: "dns_txt",
          domain,
          challenge_token: challengeToken,
          status: "pending",
          requested_at: new Date().toISOString(),
          instructions: `Add a DNS TXT record: ${recordName} → ${challengeToken}`,
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
        record_name: recordName,
        record_value: challengeToken,
        instructions: `Add a TXT record for ${recordName} with value: ${challengeToken}. Then call this endpoint again with level=domain and domain=${domain} to complete verification.`,
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
