import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { checkRate, resolveBucket, ROUTE_LIMITS, _resetForTests, _size } from "../src/lib/rate-limit.ts";

const T0 = 1_000_000;

beforeEach(() => _resetForTests());

test("limit is enforced and resets after the window", () => {
  const limit = ROUTE_LIMITS["/api/v1/apply"];
  for (let i = 0; i < limit; i++) {
    const r = checkRate("1.1.1.1", "/api/v1/apply", T0 + i);
    assert.strictEqual(r.allowed, true, `request ${i + 1} should be allowed`);
    assert.strictEqual(r.remaining, limit - i - 1);
  }
  const blocked = checkRate("1.1.1.1", "/api/v1/apply", T0 + limit);
  assert.strictEqual(blocked.allowed, false);
  assert.strictEqual(blocked.remaining, 0);
  assert.strictEqual(blocked.resetAt, T0 + 60_000);

  const after = checkRate("1.1.1.1", "/api/v1/apply", T0 + 60_001);
  assert.strictEqual(after.allowed, true);
  assert.strictEqual(after.remaining, limit - 1);
  assert.strictEqual(after.resetAt, T0 + 60_001 + 60_000);
});

test("two receipt ids share one bucket", () => {
  const a = resolveBucket("/api/v1/bazaar/receipts/abc");
  const b = resolveBucket("/api/v1/bazaar/receipts/xyz");
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.bucket, "/api/v1");
  assert.strictEqual(a.limit, 100);

  for (let i = 0; i < 100; i++) {
    checkRate("2.2.2.2", `/api/v1/bazaar/receipts/id-${i}`, T0 + i);
  }
  assert.strictEqual(_size(), 1);
  const blocked = checkRate("2.2.2.2", "/api/v1/bazaar/receipts/brand-new-id", T0 + 100);
  assert.strictEqual(blocked.allowed, false);
});

test("/api/v1/waitlist gets limit 10 and unknown paths fall back to /api", () => {
  assert.deepStrictEqual(resolveBucket("/api/v1/waitlist"), { bucket: "/api/v1/waitlist", limit: 10 });
  assert.strictEqual(checkRate("3.3.3.3", "/api/v1/waitlist", T0).limit, 10);
  // Prefix only counts when followed by "/", not as a bare string prefix.
  assert.deepStrictEqual(resolveBucket("/api/v1/waitlisted"), { bucket: "/api/v1", limit: 100 });
  assert.deepStrictEqual(resolveBucket("/api/bazaar/catalog"), { bucket: "/api", limit: 100 });
});

test("expired entries are swept at most once per 60 seconds", () => {
  for (let i = 0; i < 5; i++) checkRate(`10.0.0.${i}`, "/api/v1/stats", T0);
  assert.strictEqual(_size(), 5);

  // All five expire at T0 + 60_000. A call before the next sweep tick leaves them in place.
  checkRate("10.0.0.99", "/api/v1/stats", T0 + 59_999);
  assert.strictEqual(_size(), 6);

  // At T0 + 60_001 the sweep runs; the five originals are expired, the 59_999 one is not.
  checkRate("10.0.0.100", "/api/v1/stats", T0 + 60_001);
  assert.strictEqual(_size(), 2);
});

test("size cap holds at 10000 entries by evicting the oldest", () => {
  for (let i = 0; i < 10_000; i++) checkRate(`ip-${i}`, "/api/v1/status", T0);
  assert.strictEqual(_size(), 10_000);

  checkRate("ip-overflow", "/api/v1/status", T0 + 1);
  assert.strictEqual(_size(), 10_000);

  // The oldest-inserted entry (ip-0) was evicted, so it now starts a fresh window.
  const r = checkRate("ip-0", "/api/v1/status", T0 + 2);
  assert.strictEqual(r.remaining, ROUTE_LIMITS["/api/v1/status"] - 1);
  assert.strictEqual(_size(), 10_000);
});
