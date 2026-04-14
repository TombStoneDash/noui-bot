/**
 * In-memory store for Bot CAPTCHA challenges, tokens, and stats.
 * MVP implementation — replace with DB persistence in follow-up.
 */

export interface StoredChallenge {
  id: string;
  type: string;
  level: number;
  payload: Record<string, unknown>;
  answer: string;
  time_limit_ms: number;
  issued_at: string;
  expires_at: string;
  consumed: boolean;
  ip_hash: string;
}

export interface StoredToken {
  token: string;
  agent_id: string;
  level: number;
  challenge_type: string;
  response_time_ms: number;
  metadata: Record<string, unknown>;
  issued_at: string;
  expires_at: string;
}

interface Stats {
  total_challenges_issued: number;
  total_verifications: number;
  total_passes: number;
  total_fails: number;
  level_attempts: Record<number, { issued: number; passed: number }>;
  human_demo: {
    total_attempts: number;
    score_distribution: Record<number, number>;
    total_score_sum: number;
  };
  fastest_response_ms: Record<string, number>;
  last_24h_challenges: number;
  last_24h_verifications: number;
}

// Rate limit tracking: IP hash -> timestamps
const rateLimits = new Map<string, number[]>();

// Challenge store with auto-cleanup
const challenges = new Map<string, StoredChallenge>();

// Token store
const tokens = new Map<string, StoredToken>();

// Aggregate stats
const stats: Stats = {
  total_challenges_issued: 0,
  total_verifications: 0,
  total_passes: 0,
  total_fails: 0,
  level_attempts: {
    1: { issued: 0, passed: 0 },
    2: { issued: 0, passed: 0 },
    3: { issued: 0, passed: 0 },
  },
  human_demo: {
    total_attempts: 0,
    score_distribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    total_score_sum: 0,
  },
  fastest_response_ms: {},
  last_24h_challenges: 0,
  last_24h_verifications: 0,
};

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

/** Store a challenge */
export function storeChallenge(challenge: StoredChallenge): void {
  challenges.set(challenge.id, challenge);
  stats.total_challenges_issued++;
  stats.last_24h_challenges++;
  const levelStats = stats.level_attempts[challenge.level];
  if (levelStats) levelStats.issued++;

  // Auto-cleanup expired challenges every 100 inserts
  if (stats.total_challenges_issued % 100 === 0) {
    const now = Date.now();
    for (const [id, ch] of challenges) {
      if (new Date(ch.expires_at).getTime() < now) challenges.delete(id);
    }
  }
}

/** Get and consume a challenge */
export function getChallenge(id: string): StoredChallenge | null {
  return challenges.get(id) || null;
}

export function consumeChallenge(id: string): void {
  const ch = challenges.get(id);
  if (ch) ch.consumed = true;
}

/** Store a verified token */
export function storeToken(token: StoredToken): void {
  tokens.set(token.token, token);
  stats.total_verifications++;
  stats.total_passes++;
  stats.last_24h_verifications++;
  const levelStats = stats.level_attempts[token.level];
  if (levelStats) levelStats.passed++;

  // Track fastest
  const key = token.challenge_type;
  if (!stats.fastest_response_ms[key] || token.response_time_ms < stats.fastest_response_ms[key]) {
    stats.fastest_response_ms[key] = token.response_time_ms;
  }
}

/** Record a failed verification */
export function recordFail(): void {
  stats.total_verifications++;
  stats.total_fails++;
  stats.last_24h_verifications++;
}

/** Get stats */
export function getStats() {
  const passRate = stats.total_verifications > 0
    ? ((stats.total_passes / stats.total_verifications) * 100)
    : 0;

  return {
    total_challenges_issued: stats.total_challenges_issued,
    total_verifications: stats.total_verifications,
    pass_rate: {
      overall: Math.round(passRate * 10) / 10,
      level_1: stats.level_attempts[1].issued > 0
        ? Math.round((stats.level_attempts[1].passed / stats.level_attempts[1].issued) * 1000) / 10
        : 0,
      level_2: stats.level_attempts[2].issued > 0
        ? Math.round((stats.level_attempts[2].passed / stats.level_attempts[2].issued) * 1000) / 10
        : 0,
      level_3: stats.level_attempts[3].issued > 0
        ? Math.round((stats.level_attempts[3].passed / stats.level_attempts[3].issued) * 1000) / 10
        : 0,
    },
    human_demo: {
      total_attempts: stats.human_demo.total_attempts,
      average_score: stats.human_demo.total_attempts > 0
        ? Math.round((stats.human_demo.total_score_sum / stats.human_demo.total_attempts) * 10) / 10
        : 0,
      score_distribution: { ...stats.human_demo.score_distribution },
    },
    fastest_response_ms: { ...stats.fastest_response_ms },
    last_24h: {
      challenges: stats.last_24h_challenges,
      verifications: stats.last_24h_verifications,
    },
  };
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
