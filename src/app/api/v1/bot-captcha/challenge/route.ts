import { NextRequest, NextResponse } from "next/server";
import {
  hashIP,
  checkRateLimit,
  storeChallenge,
  hashAnswer,
  randomBase62,
} from "@/lib/botproof-store";

/** Generate a nested JSON object for json_extract challenges */
function generateJsonExtractChallenge(): {
  payload: { data: Record<string, unknown>; path: string };
  answer: string;
} {
  const datasets = [
    {
      data: {
        system: {
          id: "noui-" + randomBase62(5),
          agents: [
            { name: "Daisy", config: { mode: "active", retries: 3, timeout: 500 } },
            { name: "Sentinel", config: { mode: "passive", retries: 5, timeout: 200 } },
          ],
          meta: { version: "2.1.4", protocol: "mcp-billing-v1" },
        },
      },
      questions: [
        { path: "system.agents[0].config.timeout", answer: "500" },
        { path: "system.agents[1].config.retries", answer: "5" },
        { path: "system.meta.protocol", answer: "mcp-billing-v1" },
        { path: "system.agents[0].config.mode", answer: "active" },
      ],
    },
    {
      data: {
        cluster: {
          nodes: 8,
          services: [
            { id: "auth-v3", port: 8443, healthy: true },
            { id: "billing-v2", port: 9090, healthy: true },
          ],
          region: { primary: "us-west-2", failover: "eu-central-1" },
        },
      },
      questions: [
        { path: "cluster.services[0].port", answer: "8443" },
        { path: "cluster.services[1].id", answer: "billing-v2" },
        { path: "cluster.region.failover", answer: "eu-central-1" },
        { path: "cluster.nodes", answer: "8" },
      ],
    },
  ];

  const ds = datasets[Math.floor(Math.random() * datasets.length)];
  const q = ds.questions[Math.floor(Math.random() * ds.questions.length)];
  return { payload: { data: ds.data, path: q.path }, answer: q.answer };
}

/** Generate a random arithmetic expression */
function generateArithmeticChallenge(): {
  payload: { expression: string };
  answer: string;
} {
  const a = Math.floor(Math.random() * 900) + 100;
  const b = Math.floor(Math.random() * 90) + 10;
  const c = Math.floor(Math.random() * 9000) + 1000;
  const d = Math.floor(Math.random() * 200) + 50;
  const expression = `((${a} * ${b}) + ${c}) % ${d}`;
  const result = ((a * b) + c) % d;
  return { payload: { expression }, answer: String(result) };
}

/** Generate SHA-256 hash challenge */
async function generateHashChallenge(): Promise<{
  payload: { input: string };
  answer: string;
}> {
  const hex = randomBase62(8).toLowerCase();
  const input = `forthebots:${hex}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const fullHash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { payload: { input }, answer: fullHash.substring(0, 16) };
}

/** Level 1 challenge types and their generators */
const level1Types = ["hash_sha256", "json_extract", "arithmetic"] as const;

const timeLimits: Record<string, number> = {
  hash_sha256: 500,
  json_extract: 200,
  arithmetic: 100,
};

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);

    // Rate limit: 10 challenges/min per IP
    if (!checkRateLimit(ipHash, 10)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 challenges per minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const level = Math.min(3, Math.max(1, Number(body.level) || 1));

    // For MVP, only Level 1 challenges are implemented
    if (level > 1) {
      return NextResponse.json(
        { error: `Level ${level} challenges coming soon. Use level 1 for now.` },
        { status: 400 }
      );
    }

    // Pick random challenge type
    const type = level1Types[Math.floor(Math.random() * level1Types.length)];
    const timeLimit = timeLimits[type];

    let payload: Record<string, unknown>;
    let answer: string;

    switch (type) {
      case "hash_sha256": {
        const ch = await generateHashChallenge();
        payload = ch.payload;
        answer = ch.answer;
        break;
      }
      case "json_extract": {
        const ch = generateJsonExtractChallenge();
        payload = ch.payload;
        answer = ch.answer;
        break;
      }
      case "arithmetic": {
        const ch = generateArithmeticChallenge();
        payload = ch.payload;
        answer = ch.answer;
        break;
      }
    }

    const challengeId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60000); // 60s TTL
    const answerHash = await hashAnswer(answer);

    await storeChallenge({
      id: challengeId,
      type,
      level,
      payload,
      answerHash,
      timeLimitMs: timeLimit,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipHash,
    });

    return NextResponse.json({
      challenge_id: challengeId,
      type,
      payload,
      constraints: {
        time_limit_ms: timeLimit,
        format: type === "hash_sha256" ? "hex_string_16" : type === "json_extract" ? "string" : "integer",
      },
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
