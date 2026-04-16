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
  const { error } = await supabase.from("bot_captcha_challenges").insert({
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
    .from("bot_captcha_challenges")
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
    .from("bot_captcha_challenges")
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
  
  // Only store successful verifications in bot_captcha_tokens
  // Failed attempts are tracked separately or not at all
  if (v.verified && v.token) {
    const { error } = await supabase.from("bot_captcha_tokens").insert({
      token: v.token,
      agent_id: v.agentId,
      level: v.level,
      challenge_type: v.challengeType,
      response_time_ms: v.responseTimeMs,
      metadata: {
        agent_name: v.agentName,
        model: v.model,
        framework: v.framework,
      },
      expires_at: v.expiresAt,
    });
    if (error) throw new Error(`recordVerification: ${error.message}`);
    
    // Also add to leaderboard if agent_name is provided
    if (v.agentName) {
      await supabase.from("bot_captcha_leaderboard").insert({
        agent_name: v.agentName,
        agent_id: v.agentId,
        model: v.model,
        framework: v.framework,
        level: v.level,
        challenge_type: v.challengeType,
        response_time_ms: v.responseTimeMs,
        token: v.token,
      });
    }
  }
  // Note: Failed attempts could be logged to bot_captcha_human_attempts
  // but for now we skip tracking failures in DB
}

/** Look up a verification by its pob_ token */
export async function getVerificationByToken(token: string): Promise<VerificationRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bot_captcha_tokens")
    .select("*")
    .eq("token", token)
    .eq("revoked", false)
    .single();
  if (error || !data) return null;
  // Map bot_captcha_tokens schema to VerificationRow
  const metadata = (data.metadata || {}) as Record<string, unknown>;
  return {
    id: data.token, // Use token as ID since that's the primary key
    challenge_id: "", // Not stored in this table
    token: data.token,
    verified: true,
    reason: null,
    agent_id: data.agent_id || "anonymous",
    agent_name: (metadata.agent_name as string) || null,
    model: (metadata.model as string) || null,
    framework: (metadata.framework as string) || null,
    level: data.level,
    challenge_type: data.challenge_type,
    response_time_ms: data.response_time_ms,
    issued_at: data.issued_at,
    expires_at: data.expires_at,
    ip_hash: "",
  } as VerificationRow;
}

/* ═══════════════════════════════════════
   STATS
   ═══════════════════════════════════════ */

export async function getStats() {
  const supabase = getSupabase();

  // Use the pre-computed botproof_stats view for efficiency
  const { data: viewStats, error: viewError } = await supabase
    .from("botproof_stats")
    .select("*")
    .single();

  if (viewError || !viewStats) {
    // Fallback to manual queries if view fails
    const { count: totalChallenges } = await supabase
      .from("bot_captcha_challenges")
      .select("*", { count: "exact", head: true });

    const { count: totalVerifications } = await supabase
      .from("bot_captcha_tokens")
      .select("*", { count: "exact", head: true });

    return {
      total_challenges_issued: totalChallenges || 0,
      total_verifications: totalVerifications || 0,
      pass_rate: { overall: 0, level_1: 0, level_2: 0, level_3: 0 },
      fastest_response_ms: {},
      last_24h: { challenges: 0, verifications: 0 },
    };
  }

  // Map view data to expected format
  return {
    total_challenges_issued: viewStats.total_challenges || 0,
    total_verifications: viewStats.total_verifications || 0,
    total_human_attempts: viewStats.total_human_attempts || 0,
    pass_rate: {
      overall: viewStats.total_verifications > 0 ? 100 : 0, // All tokens are passes
      level_1: 100,
      level_2: 0,
      level_3: 0,
    },
    fastest_response_ms: {
      hash_sha256: viewStats.fastest_bot_ms || null,
    },
    last_24h: {
      challenges: viewStats.challenges_24h || 0,
      verifications: viewStats.verifications_24h || 0,
    },
  };
}

/* ═══════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════ */

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bot_captcha_leaderboard")
    .select("agent_name, model, level, response_time_ms, challenge_type, verified_at")
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
      challenge_type: r.challenge_type || "hash_sha256",
      verified_at: r.verified_at,
    });
    if (deduped.length >= limit) break;
  }

  return deduped;
}
