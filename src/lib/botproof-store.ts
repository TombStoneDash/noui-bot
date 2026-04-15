/**
 * BotProof (proof-of-bot) protocol store.
 * Persists challenges and verifications to Neon PostgreSQL.
 * Rate limiting remains in-memory (ephemeral by nature).
 */

import { sql } from "@/lib/db";

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */
export interface ChallengeRow {
  id: string;
  type: string;
  level: number;
  payload: Record<string, unknown>;
  answer_hash: string;
  time_limit_ms: number;
  issued_at: string;
  expires_at: string;
  consumed: boolean;
  ip_hash: string;
}

export interface VerificationRow {
  id: string;
  challenge_id: string;
  token: string | null;
  verified: boolean;
  reason: string | null;
  agent_id: string;
  agent_name: string | null;
  model: string | null;
  framework: string | null;
  level: number;
  challenge_type: string;
  response_time_ms: number;
  issued_at: string;
  expires_at: string | null;
  ip_hash: string;
}

export interface LeaderboardEntry {
  agent_name: string;
  model: string;
  level: number;
  response_time_ms: number;
  challenge_type: string;
  verified_at: string;
}

/* ═══════════════════════════════════════
   RATE LIMITING (in-memory — ephemeral)
   ═══════════════════════════════════════ */
const rateLimits = new Map<string, number[]>();

/** Hash an IP for privacy */
export async function hashIP(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip + "noui-salt-v1")
  );
  return Array.from(new Uint8Array(buf).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check rate limit: returns true if allowed */
export function checkRateLimit(ipHash: string, maxPerMin: number): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(ipHash) || [];
  const recent = timestamps.filter((t) => now - t < 60000);
  if (recent.length >= maxPerMin) return false;
  recent.push(now);
  rateLimits.set(ipHash, recent);
  return true;
}

/** Generate a random base62 string */
export function randomBase62(length: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => chars[b % chars.length])
    .join("");
}

/** Hash an answer for storage (we never store raw answers) */
export async function hashAnswer(answer: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(answer.toLowerCase())
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ═══════════════════════════════════════
   CHALLENGE OPERATIONS
   ═══════════════════════════════════════ */

/** Store a new challenge */
export async function storeChallenge(challenge: {
  id: string;
  type: string;
  level: number;
  payload: Record<string, unknown>;
  answerHash: string;
  timeLimitMs: number;
  issuedAt: string;
  expiresAt: string;
  ipHash: string;
}): Promise<void> {
  await sql`
    INSERT INTO noui.botproof_challenges (id, type, level, payload, answer_hash, time_limit_ms, issued_at, expires_at, ip_hash)
    VALUES (${challenge.id}::uuid, ${challenge.type}, ${challenge.level}, ${JSON.stringify(challenge.payload)}::jsonb, ${challenge.answerHash}, ${challenge.timeLimitMs}, ${challenge.issuedAt}::timestamptz, ${challenge.expiresAt}::timestamptz, ${challenge.ipHash})
  `;
}

/** Get a challenge by ID (not consumed, not expired) */
export async function getChallenge(id: string): Promise<ChallengeRow | null> {
  const rows = await sql`
    SELECT id, type, level, payload, answer_hash, time_limit_ms, issued_at, expires_at, consumed, ip_hash
    FROM noui.botproof_challenges
    WHERE id = ${id}::uuid
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    type: r.type,
    level: r.level,
    payload: r.payload as Record<string, unknown>,
    answer_hash: r.answer_hash,
    time_limit_ms: r.time_limit_ms,
    issued_at: r.issued_at,
    expires_at: r.expires_at,
    consumed: r.consumed,
    ip_hash: r.ip_hash,
  };
}

/** Mark a challenge as consumed */
export async function consumeChallenge(id: string): Promise<void> {
  await sql`
    UPDATE noui.botproof_challenges SET consumed = true WHERE id = ${id}::uuid
  `;
}

/* ═══════════════════════════════════════
   VERIFICATION OPERATIONS
   ═══════════════════════════════════════ */

/** Record a verification (success or failure) */
export async function recordVerification(v: {
  challengeId: string;
  token: string | null;
  verified: boolean;
  reason: string | null;
  agentId: string;
  agentName: string | null;
  model: string | null;
  framework: string | null;
  level: number;
  challengeType: string;
  responseTimeMs: number;
  expiresAt: string | null;
  ipHash: string;
}): Promise<void> {
  await sql`
    INSERT INTO noui.botproof_verifications
      (challenge_id, token, verified, reason, agent_id, agent_name, model, framework, level, challenge_type, response_time_ms, expires_at, ip_hash)
    VALUES
      (${v.challengeId}::uuid, ${v.token}, ${v.verified}, ${v.reason}, ${v.agentId}, ${v.agentName}, ${v.model}, ${v.framework}, ${v.level}, ${v.challengeType}, ${v.responseTimeMs}, ${v.expiresAt ? v.expiresAt : null}::timestamptz, ${v.ipHash})
  `;
}

/* ═══════════════════════════════════════
   STATS
   ═══════════════════════════════════════ */

export async function getStats() {
  const [totals] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE verified = true) AS total_passes,
      COUNT(*) FILTER (WHERE verified = false) AS total_fails,
      COUNT(*) AS total_verifications
    FROM noui.botproof_verifications
  `;

  const [challengeCount] = await sql`
    SELECT COUNT(*) AS total FROM noui.botproof_challenges
  `;

  const levelRows = await sql`
    SELECT
      level,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE verified = true) AS passed
    FROM noui.botproof_verifications
    GROUP BY level
  `;

  const levelStats: Record<number, { issued: number; passed: number }> = {
    1: { issued: 0, passed: 0 },
    2: { issued: 0, passed: 0 },
    3: { issued: 0, passed: 0 },
  };
  for (const r of levelRows) {
    levelStats[r.level] = { issued: Number(r.total), passed: Number(r.passed) };
  }

  const fastestRows = await sql`
    SELECT challenge_type, MIN(response_time_ms) AS fastest
    FROM noui.botproof_verifications
    WHERE verified = true
    GROUP BY challenge_type
  `;
  const fastest: Record<string, number> = {};
  for (const r of fastestRows) {
    fastest[r.challenge_type] = Number(r.fastest);
  }

  const [last24h] = await sql`
    SELECT
      (SELECT COUNT(*) FROM noui.botproof_challenges WHERE issued_at > NOW() - INTERVAL '24 hours') AS challenges,
      (SELECT COUNT(*) FROM noui.botproof_verifications WHERE issued_at > NOW() - INTERVAL '24 hours') AS verifications
  `;

  const totalVerifications = Number(totals.total_verifications);
  const totalPasses = Number(totals.total_passes);
  const passRate = totalVerifications > 0 ? Math.round((totalPasses / totalVerifications) * 1000) / 10 : 0;

  return {
    total_challenges_issued: Number(challengeCount.total),
    total_verifications: totalVerifications,
    pass_rate: {
      overall: passRate,
      level_1: levelStats[1].issued > 0 ? Math.round((levelStats[1].passed / levelStats[1].issued) * 1000) / 10 : 0,
      level_2: levelStats[2].issued > 0 ? Math.round((levelStats[2].passed / levelStats[2].issued) * 1000) / 10 : 0,
      level_3: levelStats[3].issued > 0 ? Math.round((levelStats[3].passed / levelStats[3].issued) * 1000) / 10 : 0,
    },
    fastest_response_ms: fastest,
    last_24h: {
      challenges: Number(last24h.challenges),
      verifications: Number(last24h.verifications),
    },
  };
}

/* ═══════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════ */

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await sql`
    SELECT DISTINCT ON (agent_name)
      agent_name, model, level, response_time_ms, challenge_type, issued_at AS verified_at
    FROM noui.botproof_verifications
    WHERE verified = true AND agent_name IS NOT NULL
    ORDER BY agent_name, response_time_ms ASC
  `;

  // Sort by fastest response time across all agents
  const sorted = rows
    .map((r) => ({
      agent_name: r.agent_name as string,
      model: (r.model || "unknown") as string,
      level: r.level as number,
      response_time_ms: r.response_time_ms as number,
      challenge_type: r.challenge_type as string,
      verified_at: r.verified_at as string,
    }))
    .sort((a, b) => a.response_time_ms - b.response_time_ms)
    .slice(0, limit);

  return sorted;
}
