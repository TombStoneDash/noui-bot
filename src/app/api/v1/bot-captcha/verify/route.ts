import { NextRequest, NextResponse } from "next/server";
import {
  hashIP,
  checkRateLimit,
  getChallenge,
  consumeChallenge,
  hashAnswer,
  recordVerification,
  randomBase62,
} from "@/lib/botproof-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AGENT_ID_LENGTH = 128;
const MAX_METADATA_LENGTH = 64;

/**
 * Optional caller-supplied text. agent_name, model and framework are shown on
 * the public leaderboard, so they must be short strings, not arbitrary JSON.
 * Returns null when absent, the trimmed string when valid, or undefined when invalid.
 */
function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return undefined;
  return trimmed || null;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    // Rate limit: 100 verifications/min per IP
    if (!checkRateLimit(ipHash, 100, "verify")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 100 verifications per minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        !body.challenge_id || body.response === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: challenge_id, response" },
        { status: 400 }
      );
    }

    const { challenge_id, response, metadata } = body;
    if (typeof challenge_id !== "string") {
      return NextResponse.json({ error: "challenge_id must be a string." }, { status: 400 });
    }
    if (response === null || typeof response === "object") {
      return NextResponse.json({ error: "response must be a string or number." }, { status: 400 });
    }
    if (metadata !== undefined && metadata !== null &&
        (typeof metadata !== "object" || Array.isArray(metadata))) {
      return NextResponse.json({ error: "metadata must be an object." }, { status: 400 });
    }

    const agentIdValue = optionalText(body.agent_id, MAX_AGENT_ID_LENGTH);
    const agentName = optionalText(metadata?.agent_name, MAX_METADATA_LENGTH);
    const model = optionalText(metadata?.model, MAX_METADATA_LENGTH);
    const framework = optionalText(metadata?.framework, MAX_METADATA_LENGTH);
    if (agentIdValue === undefined) {
      return NextResponse.json(
        { error: `agent_id must be a string of at most ${MAX_AGENT_ID_LENGTH} characters.` },
        { status: 400 }
      );
    }
    if (agentName === undefined || model === undefined || framework === undefined) {
      return NextResponse.json(
        { error: `metadata.agent_name, metadata.model and metadata.framework must be strings of at most ${MAX_METADATA_LENGTH} characters.` },
        { status: 400 }
      );
    }
    const agentId = agentIdValue || "anonymous";

    // Look up challenge (a malformed ID cannot exist, so skip the database)
    const challenge = UUID_RE.test(challenge_id) ? await getChallenge(challenge_id) : null;
    if (!challenge) {
      return NextResponse.json(
        { verified: false, reason: "not_found", response_time_ms: 0 },
        { status: 404 }
      );
    }

    const now = Date.now();
    const responseTimeMs = now - new Date(challenge.issued_at).getTime();

    // Claim the challenge before judging it. Only one submission can win the
    // claim, so a challenge never mints more than one token.
    const claimed = !challenge.consumed && await consumeChallenge(challenge_id);

    let reason: string | null = null;
    if (!claimed) {
      reason = "already_used";
    } else if (now > new Date(challenge.expires_at).getTime()) {
      reason = "expired";
    } else if (responseTimeMs > challenge.time_limit_ms) {
      reason = "timeout";
    } else if (await hashAnswer(String(response).trim()) !== challenge.answer_hash) {
      reason = "incorrect";
    }

    if (reason) {
      const reportedTimeMs = reason === "timeout" || reason === "incorrect" ? responseTimeMs : 0;
      await recordVerification({
        challengeId: challenge_id,
        token: null,
        verified: false,
        reason,
        agentId,
        agentName,
        model,
        framework,
        level: challenge.level,
        challengeType: challenge.type,
        responseTimeMs: reportedTimeMs,
        expiresAt: null,
        ipHash,
      });
      return NextResponse.json(
        {
          verified: false,
          reason,
          challenge_type: challenge.type,
          response_time_ms: reportedTimeMs,
        },
        { status: 401 }
      );
    }

    // Success — generate BotProof token
    const isDev = process.env.NODE_ENV === "development";
    const tokenPrefix = isDev ? "pob_test_" : "pob_live_";
    const token = tokenPrefix + randomBase62(32);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000); // 24h

    await recordVerification({
      challengeId: challenge_id,
      token,
      verified: true,
      reason: null,
      agentId,
      agentName,
      model,
      framework,
      level: challenge.level,
      challengeType: challenge.type,
      responseTimeMs,
      expiresAt: expiresAt.toISOString(),
      ipHash,
    });

    return NextResponse.json({
      verified: true,
      token,
      level: challenge.level,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      agent_id: agentId,
      challenge_type: challenge.type,
      response_time_ms: responseTimeMs,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
