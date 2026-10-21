import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

process.env.RECEIPT_SIGNING_SECRET = "";
const billingUrl = new URL("../src/lib/proxy-billing.ts", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === billingUrl && specifier === "./receipts") return nextResolve("./receipts.ts", context);
    return nextResolve(specifier, context);
  },
});
const { lookupIdempotency, withIdempotency, isIdempotencyExpired, IDEMPOTENCY_TTL_MS } = await import("../src/lib/proxy-billing.ts");
hooks.deregister();

const CONSUMER = "11111111-1111-4111-8111-111111111111";
const NOW = Date.parse("2026-10-21T12:00:00Z");

// In-memory bazaar_idempotency_keys with select/insert/delete.
function store({ deleteError = null } = {}) {
  const rows = new Map();
  const calls = [];
  const from = (table) => {
    const op = (name, payload) => {
      const filters = [];
      const run = () => {
        calls.push({ table, op: name, payload, filters });
        const k = filters.map(([, v]) => v).join("|");
        if (name === "select") return { data: rows.get(k) ?? null, error: null };
        if (name === "insert") { rows.set(`${payload.consumer_id}|${payload.key}`, { ...payload, created_at: new Date().toISOString() }); return { error: null }; }
        if (name === "delete") { if (deleteError) return { error: deleteError }; rows.delete(k); return { error: null }; }
        return { error: null };
      };
      const b = {
        eq(c, v) { filters.push([c, v]); return b; },
        maybeSingle: () => Promise.resolve(run()),
        then: (f, r) => Promise.resolve(run()).then(f, r),
      };
      return b;
    };
    return { select: (c) => op("select", c), insert: (r) => op("insert", r), delete: () => op("delete") };
  };
  return { rows, calls, from, rpc: () => Promise.resolve({ data: null, error: null }) };
}

const response = (hash) => ({ body_hash: hash, status: 200, body: { ok: true }, headers: {} });

test("ttl: constant is 24 h; expiry boundary and missing timestamp", () => {
  assert.equal(IDEMPOTENCY_TTL_MS, 86_400_000);
  assert.equal(isIdempotencyExpired(new Date(NOW - IDEMPOTENCY_TTL_MS).toISOString(), NOW), false);
  assert.equal(isIdempotencyExpired(new Date(NOW - IDEMPOTENCY_TTL_MS - 1).toISOString(), NOW), true);
  assert.equal(isIdempotencyExpired(undefined, NOW), false);
  assert.equal(isIdempotencyExpired("not a date", NOW), false);
});

test("ttl: fresh row (<24 h) is still a hit", async () => {
  const sb = store();
  sb.rows.set(`${CONSUMER}|k1`, { response: response("h"), created_at: new Date(NOW - 3600_000).toISOString() });
  const out = await lookupIdempotency(sb, CONSUMER, "k1", "h", NOW);
  assert.equal(out.kind, "hit");
  assert.equal(sb.calls.some((c) => c.op === "delete"), false);
});

test("ttl: expired row is deleted and treated as an available miss (even with a different body)", async () => {
  const sb = store();
  sb.rows.set(`${CONSUMER}|k1`, { response: response("old"), created_at: new Date(NOW - IDEMPOTENCY_TTL_MS - 1).toISOString() });
  const out = await lookupIdempotency(sb, CONSUMER, "k1", "new", NOW);
  assert.deepEqual(out, { kind: "miss", available: true });
  const del = sb.calls.find((c) => c.op === "delete");
  assert.deepEqual(del.filters, [["consumer_id", CONSUMER], ["key", "k1"]]);
  assert.equal(sb.rows.has(`${CONSUMER}|k1`), false);
});

test("ttl: delete failure -> miss with available:false (no store attempted)", async () => {
  const sb = store({ deleteError: { message: "denied" } });
  sb.rows.set(`${CONSUMER}|k1`, { response: response("old"), created_at: "2020-01-01T00:00:00Z" });
  const out = await lookupIdempotency(sb, CONSUMER, "k1", "new", NOW);
  assert.deepEqual(out, { kind: "miss", available: false });
});

test("ttl: withIdempotency re-runs and re-stores an expired key", async () => {
  const sb = store();
  sb.rows.set(`${CONSUMER}|k1`, { response: response("old"), created_at: "2020-01-01T00:00:00Z" });
  let runs = 0;
  const out = await withIdempotency(sb, CONSUMER, "k1", "new", async () => { runs++; return { response: response("new"), receiptId: "r_2" }; });
  assert.equal(runs, 1);
  assert.equal(out.kind, "fresh");
  assert.equal(out.stored, true);
  assert.equal(sb.rows.get(`${CONSUMER}|k1`).receipt_id, "r_2");
});

test("sql/009: purge function only, additive, 24 h default", () => {
  const sql = readFileSync(new URL("../sql/009_idempotency_ttl_purge.sql", import.meta.url), "utf8");
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.match(code, /CREATE OR REPLACE FUNCTION bazaar_purge_idempotency_keys/);
  assert.match(code, /INTERVAL '24 hours'/);
  assert.match(code, /DELETE FROM bazaar_idempotency_keys\s+WHERE created_at < NOW\(\) - p_older_than/);
  assert.doesNotMatch(code, /DROP |TRUNCATE|ALTER TABLE/i);
});
