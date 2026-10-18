import { NextRequest, NextResponse } from "next/server";
import { hashIP, checkRateLimit, getLeaderboard } from "@/lib/botproof-store";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    if (!checkRateLimit(ipHash, 100)) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    const rawLimit = request.nextUrl.searchParams.get("limit");
    const limit = rawLimit === null ? 10 : Number(rawLimit);
    if ((rawLimit !== null && !/^[0-9]+$/.test(rawLimit)) ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      return NextResponse.json({ error: "Limit must be an integer from 1 to 50." }, { status: 400 });
    }

    const entries = (await getLeaderboard(limit)).slice(0, limit);

    return NextResponse.json(
      { entries, count: entries.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });
  }
}
