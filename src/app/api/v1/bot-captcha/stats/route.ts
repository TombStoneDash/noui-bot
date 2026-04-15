import { NextRequest, NextResponse } from "next/server";
import { hashIP, checkRateLimit, getStats } from "@/lib/botproof-store";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    // Rate limit: 100 req/min for stats
    if (!checkRateLimit(ipHash, 100)) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429 }
      );
    }

    const stats = await getStats();

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
