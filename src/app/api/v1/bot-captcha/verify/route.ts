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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    // Rate limit: 100 verifications/min per IP
    if (!checkRateLimit(ipHash, 100)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 100 verifications per minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.challenge_id || body.response === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: challenge_id, response" },
        { status: 400 }
      );
    }

    const { challenge_id, response, agent_id, metadata } = body;
    const agentName = metadata?.agent_name || null;
    const model = metadata?.model || null;
    const framework = metadata?.framework || null;

    // Look up challenge
    const challenge = await getChallenge(challenge_id);
    if (!challenge) {
      return NextResponse.json(
        { verified: false, reason: "not_found", response_time_ms: 0 },
        { status: 404 }
      );
    }

    // Check if already consumed
    if (challenge.consumed) {
      await recordVerification({
        challengeId: challenge_id,
        token: null,
        verified: false,
        reason: "already_used",
        agentId: agent_id || "anonymous",
        agentName,
        model,
        framework,
        level: challenge.level,
        challengeType: challenge.type,
        responseTimeMs: 0,
        expiresAt: null,
        ipHash,
      });
      return NextResponse.json(
        {
          verified: false,
          reason: "already_used",
          challenge_type: challenge.type,
          response_time_ms: 0,
        },
        { status: 401 }
      );
    }

    // Check if expired
    const now = Date.now();
    if (now > new Date(challenge.expires_at).getTime()) {
      await consumeChallenge(challenge_id);
      await recordVerification({
        challengeId: challenge_id,
        token: null,
        verified: false,
        reason: "expired",
        agentId: agent_id || "anonymous",
        agentName,
        model,
        framework,
        level: challenge.level,
        challengeType: challenge.type,
        responseTimeMs: 0,
        expiresAt: null,
        ipHash,
      });
      return NextResponse.json(
        {
          verified: false,
          reason: "expired",
          challenge_type: challenge.type,
          response_time_ms: 0,
        },
        { status: 401 }
      );
    }

    // Calculate response time
    const responseTimeMs = now - new Date(challenge.issued_at).getTime();

    // Check timing constraint
    if (responseTimeMs > challenge.time_limit_ms) {
      await consumeChallenge(challenge_id);
      await recordVerification({
        challengeId: challenge_id,
        token: null,
        verified: false,
        reason: "timeout",
        agentId: agent_id || "anonymous",
        agentName,
        model,
        framework,
        level: challenge.level,
        challengeType: challenge.type,
        responseTimeMs,
        expiresAt: null,
        ipHash,
      });
      return NextResponse.json(
        {
          verified: false,
          reason: "timeout",
          challenge_type: challenge.type,
          response_time_ms: responseTimeMs,
        },
        { status: 401 }
      );
    }

    // Verify answer by comparing hashes
    const submittedHash = await hashAnswer(String(response).trim());
    if (submittedHash !== challenge.answer_hash) {
      await consumeChallenge(challenge_id);
      await recordVerification({
        challengeId: challenge_id,
        token: null,
        verified: false,
        reason: "incorrect",
        agentId: agent_id || "anonymous",
        agentName,
        model,
        framework,
        level: challenge.level,
        challengeType: challenge.type,
        responseTimeMs,
        expiresAt: null,
        ipHash,
      });
      return NextResponse.json(
        {
          verified: false,
          reason: "incorrect",
          challenge_type: challenge.type,
          response_time_ms: responseTimeMs,
        },
        { status: 401 }
      );
    }

    // Success — generate BotProof token
    await consumeChallenge(challenge_id);
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
      agentId: agent_id || "anonymous",
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
      agent_id: agent_id || "anonymous",
      challenge_type: challenge.type,
      response_time_ms: responseTimeMs,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
