import { NextRequest, NextResponse } from "next/server";
import {
  hashIP,
  checkRateLimit,
  getVerificationByToken,
} from "@/lib/botproof-store";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    // Rate limit: 100 req/min
    if (!checkRateLimit(ipHash, 100)) {
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
      return NextResponse.json({ valid: false });
    }

    const verification = await getVerificationByToken(token);
    if (!verification) {
      return NextResponse.json({ valid: false });
    }

    // Check if token has expired
    if (verification.expires_at && new Date(verification.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    // Return verification status without revealing agent identity (agent_id, ip_hash)
    return NextResponse.json({
      valid: true,
      level: verification.level,
      challenge_type: verification.challenge_type,
      response_time_ms: verification.response_time_ms,
      issued_at: verification.issued_at,
      expires_at: verification.expires_at,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
