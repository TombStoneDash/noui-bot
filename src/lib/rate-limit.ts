// Pure, Edge-runtime-compatible rate limiter with a bounded in-memory store.
// No Next.js imports; erasable TypeScript only (no enums, no parameter properties).

export const ROUTE_LIMITS: Record<string, number> = {
  "/api/v1/waitlist": 10,
  "/api/v1/feedback": 30,
  "/api/v1/apply": 10,
  "/api/v1/stats": 60,
  "/api/v1/services": 60,
  "/api/v1/health": 120,
  "/api/v1/status": 60,
  "/api/v1": 100,
};

const DEFAULT_BUCKET = "/api";
const DEFAULT_LIMIT = 100;
const WINDOW_MS = 60_000;
const SWEEP_INTERVAL_MS = 60_000;
const MAX_ENTRIES = 10_000;

type Entry = { count: number; resetAt: number };

// Map preserves insertion order, so the first key is always the oldest-inserted.
const store = new Map<string, Entry>();
let lastSweepAt = -Infinity;

/**
 * Resolve a request pathname to its rate-limit bucket: the longest ROUTE_LIMITS
 * key that equals the pathname or prefixes it followed by "/". Falls back to
 * the "/api" bucket with limit 100.
 */
export function resolveBucket(pathname: string): { bucket: string; limit: number } {
  let bucket = DEFAULT_BUCKET;
  let limit = DEFAULT_LIMIT;
  let bestLength = -1;
  for (const key of Object.keys(ROUTE_LIMITS)) {
    if (key.length <= bestLength) continue;
    if (pathname === key || pathname.startsWith(key + "/")) {
      bucket = key;
      limit = ROUTE_LIMITS[key];
      bestLength = key.length;
    }
  }
  return { bucket, limit };
}

function sweep(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

function evictOldest(): void {
  const oldest = store.keys().next();
  if (!oldest.done) store.delete(oldest.value);
}

export function checkRate(
  ip: string,
  pathname: string,
  now: number = Date.now(),
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  if (now - lastSweepAt >= SWEEP_INTERVAL_MS) {
    sweep(now);
    lastSweepAt = now;
  }

  const { bucket, limit } = resolveBucket(pathname);
  const key = `${ip}:${bucket}`;

  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    // Delete first so a refreshed entry moves to the back of insertion order.
    store.delete(key);
    while (store.size >= MAX_ENTRIES) evictOldest();
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }
  entry.count++;

  return {
    allowed: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function _resetForTests(): void {
  store.clear();
  lastSweepAt = -Infinity;
}

export function _size(): number {
  return store.size;
}
