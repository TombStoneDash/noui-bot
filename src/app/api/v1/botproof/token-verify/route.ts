import { NextRequest, NextResponse } from "next/server";
import {
  hashIP,
  checkRateLimit,
  getVerificationByToken,
} from "@/lib/botproof-store";

/** Longest a shared cache may keep a "valid" answer. */
const MAX_CACHE_SECONDS = 60;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    // Rate limit: 100 req/min
    if (!checkRateLimit(ipHash, 100, "token-verify")) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429 }
      );
    }

    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "Missing required query parameter: token" },
        { status: 400 }
      );
    }

    // Validate token format
    if (!token.startsWith("pob_live_") && !token.startsWith("pob_test_")) {
      return NextResponse.json({ valid: false }, { headers: NO_STORE });
    }

    let verification;
    try {
      verification = await getVerificationByToken(token);
    } catch {
      // An outage must not read as "this token is invalid".
      return NextResponse.json(
        { error: "Token lookup is temporarily unavailable. Try again." },
        { status: 503, headers: NO_STORE }
      );
    }
    if (!verification) {
      return NextResponse.json({ valid: false }, { headers: NO_STORE });
    }

    // A token without a readable expiry is not trusted.
    const expiresAtMs = verification.expires_at ? new Date(verification.expires_at).getTime() : NaN;
    if (!Number.isFinite(expiresAtMs)) {
      return NextResponse.json({ valid: false, reason: "invalid_expiry" }, { headers: NO_STORE });
    }
    const remainingSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);
    if (remainingSeconds <= 0) {
      return NextResponse.json({ valid: false, reason: "expired" }, { headers: NO_STORE });
    }

    // Return verification status without revealing agent identity (agent_id, ip_hash).
    // A cached "valid" must never outlive the token, and is kept short so a
    // revocation takes effect within a minute; no stale-while-revalidate.
    const maxAge = Math.min(MAX_CACHE_SECONDS, remainingSeconds);
    return NextResponse.json({
      valid: true,
      level: verification.level,
      challenge_type: verification.challenge_type,
      response_time_ms: verification.response_time_ms,
      issued_at: verification.issued_at,
      expires_at: verification.expires_at,
    }, {
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${maxAge}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
