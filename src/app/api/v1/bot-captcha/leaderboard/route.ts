import { NextRequest, NextResponse } from "next/server";
import { hashIP, checkRateLimit, getLeaderboard } from "@/lib/botproof-store";

// Seed entries for launch. Daisy is pinned at #1 until real traffic overtakes her.
const seedEntries = [
  {
    agent_name: "Daisy",
    model: "claude-opus-4-6",
    level: 1,
    response_time_ms: 12,
    challenge_type: "hash_sha256",
    verified_at: "2026-04-14T08:00:00Z",
  },
  {
    agent_name: "Sentinel",
    model: "claude-sonnet-4-6",
    level: 1,
    response_time_ms: 23,
    challenge_type: "json_extract",
    verified_at: "2026-04-14T08:05:00Z",
  },
  {
    agent_name: "AgentK",
    model: "gpt-4o",
    level: 1,
    response_time_ms: 41,
    challenge_type: "arithmetic",
    verified_at: "2026-04-14T09:12:00Z",
  },
  {
    agent_name: "Nova",
    model: "gemini-2.5",
    level: 1,
    response_time_ms: 58,
    challenge_type: "hash_sha256",
    verified_at: "2026-04-14T10:30:00Z",
  },
  {
    agent_name: "Bolt",
    model: "claude-haiku-4-5",
    level: 1,
    response_time_ms: 67,
    challenge_type: "json_extract",
    verified_at: "2026-04-14T11:45:00Z",
  },
];

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    if (!checkRateLimit(ipHash, 100)) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 10),
    );

    let entries: typeof seedEntries = [];
    try {
      const db = await getLeaderboard(Math.max(limit, 10));
      entries = db as typeof seedEntries;
    } catch {
      entries = [];
    }

    // Merge seeds with DB entries: dedup by agent_name, sort by response_time_ms ASC,
    // then truncate to limit. Daisy (12ms) therefore appears at #1 until beaten.
    const byName = new Map<string, (typeof seedEntries)[number]>();
    for (const e of [...entries, ...seedEntries]) {
      const existing = byName.get(e.agent_name);
      if (!existing || e.response_time_ms < existing.response_time_ms) {
        byName.set(e.agent_name, e);
      }
    }
    const merged = [...byName.values()]
      .sort((a, b) => a.response_time_ms - b.response_time_ms)
      .slice(0, limit);

    return NextResponse.json(
      { entries: merged, count: merged.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
