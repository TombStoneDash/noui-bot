/**
 * BotProof protocol store.
 * Persists challenges and verifications to Supabase PostgreSQL.
 * Rate limiting remains in-memory (ephemeral by nature).
 */

import { getSupabase } from "@/lib/supabase";

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
  const supabase = getSupabase();
  const { error } = await supabase.from("botproof_challenges").insert({
    id: challenge.id,
    type: challenge.type,
    level: challenge.level,
    payload: challenge.payload,
    answer_hash: challenge.answerHash,
    time_limit_ms: challenge.timeLimitMs,
    issued_at: challenge.issuedAt,
    expires_at: challenge.expiresAt,
    ip_hash: challenge.ipHash,
  });
  if (error) throw new Error(`storeChallenge: ${error.message}`);
}

/** Get a challenge by ID */
export async function getChallenge(id: string): Promise<ChallengeRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("botproof_challenges")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as ChallengeRow;
}

/** Mark a challenge as consumed */
export async function consumeChallenge(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("botproof_challenges")
    .update({ consumed: true })
    .eq("id", id);
  if (error) throw new Error(`consumeChallenge: ${error.message}`);
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
  const supabase = getSupabase();
  const { error } = await supabase.from("botproof_verifications").insert({
    challenge_id: v.challengeId,
    token: v.token,
    verified: v.verified,
    reason: v.reason,
    agent_id: v.agentId,
    agent_name: v.agentName,
    model: v.model,
    framework: v.framework,
    level: v.level,
    challenge_type: v.challengeType,
    response_time_ms: v.responseTimeMs,
    expires_at: v.expiresAt,
    ip_hash: v.ipHash,
  });
  if (error) throw new Error(`recordVerification: ${error.message}`);
}

/** Look up a verification by its pob_ token */
export async function getVerificationByToken(token: string): Promise<VerificationRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("botproof_verifications")
    .select("*")
    .eq("token", token)
    .eq("verified", true)
    .single();
  if (error || !data) return null;
  return data as VerificationRow;
}

/* ═══════════════════════════════════════
   STATS
   ═══════════════════════════════════════ */

export async function getStats() {
  const supabase = getSupabase();

  // Total challenges
  const { count: totalChallenges } = await supabase
    .from("botproof_challenges")
    .select("*", { count: "exact", head: true });

  // Verification totals
  const { count: totalVerifications } = await supabase
    .from("botproof_verifications")
    .select("*", { count: "exact", head: true });

  const { count: totalPasses } = await supabase
    .from("botproof_verifications")
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  // Per-level stats
  const levelStats: Record<number, { issued: number; passed: number }> = {
    1: { issued: 0, passed: 0 },
    2: { issued: 0, passed: 0 },
    3: { issued: 0, passed: 0 },
  };

  for (const level of [1, 2, 3]) {
    const { count: issued } = await supabase
      .from("botproof_verifications")
      .select("*", { count: "exact", head: true })
      .eq("level", level);
    const { count: passed } = await supabase
      .from("botproof_verifications")
      .select("*", { count: "exact", head: true })
      .eq("level", level)
      .eq("verified", true);
    levelStats[level] = { issued: issued || 0, passed: passed || 0 };
  }

  // Fastest per challenge type
  const fastest: Record<string, number> = {};
  for (const ctype of ["hash_sha256", "json_extract", "arithmetic"]) {
    const { data } = await supabase
      .from("botproof_verifications")
      .select("response_time_ms")
      .eq("verified", true)
      .eq("challenge_type", ctype)
      .order("response_time_ms", { ascending: true })
      .limit(1);
    if (data && data.length > 0) {
      fastest[ctype] = data[0].response_time_ms;
    }
  }

  // Last 24h
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: last24hChallenges } = await supabase
    .from("botproof_challenges")
    .select("*", { count: "exact", head: true })
    .gte("issued_at", since24h);
  const { count: last24hVerifications } = await supabase
    .from("botproof_verifications")
    .select("*", { count: "exact", head: true })
    .gte("issued_at", since24h);

  const tv = totalVerifications || 0;
  const tp = totalPasses || 0;
  const passRate = tv > 0 ? Math.round((tp / tv) * 1000) / 10 : 0;

  return {
    total_challenges_issued: totalChallenges || 0,
    total_verifications: tv,
    pass_rate: {
      overall: passRate,
      level_1: levelStats[1].issued > 0 ? Math.round((levelStats[1].passed / levelStats[1].issued) * 1000) / 10 : 0,
      level_2: levelStats[2].issued > 0 ? Math.round((levelStats[2].passed / levelStats[2].issued) * 1000) / 10 : 0,
      level_3: levelStats[3].issued > 0 ? Math.round((levelStats[3].passed / levelStats[3].issued) * 1000) / 10 : 0,
    },
    fastest_response_ms: fastest,
    last_24h: {
      challenges: last24hChallenges || 0,
      verifications: last24hVerifications || 0,
    },
  };
}

/* ═══════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════ */

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("botproof_verifications")
    .select("agent_name, model, level, response_time_ms, challenge_type, issued_at")
    .eq("verified", true)
    .not("agent_name", "is", null)
    .order("response_time_ms", { ascending: true })
    .limit(limit * 3); // Over-fetch to dedup by agent_name

  if (error || !data) return [];

  // Deduplicate: keep fastest per agent_name
  const seen = new Set<string>();
  const deduped: LeaderboardEntry[] = [];
  for (const r of data) {
    if (seen.has(r.agent_name)) continue;
    seen.add(r.agent_name);
    deduped.push({
      agent_name: r.agent_name,
      model: r.model || "unknown",
      level: r.level,
      response_time_ms: r.response_time_ms,
      challenge_type: r.challenge_type,
      verified_at: r.issued_at,
    });
    if (deduped.length >= limit) break;
  }

  return deduped;
}
