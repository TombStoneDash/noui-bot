import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

process.env.RECEIPT_SIGNING_SECRET = "";
const billingUrl = new URL("../src/lib/proxy-billing.ts", import.meta.url).href;
const verifierUrl = new URL("../src/lib/receipt-verify.ts", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((context.parentURL === billingUrl || context.parentURL === verifierUrl) && specifier === "./receipts") {
      return nextResolve("./receipts.ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const billing = await import("../src/lib/proxy-billing.ts");
const { verifyReceiptEnvelope } = await import("../src/lib/receipt-verify.ts");
hooks.deregister();

const { debitAtomic, persistProxyReceipt, hashIdempotencyBody, withIdempotency, lookupIdempotency, PROXY_RECEIPT_VERIFY_URL } = billing;

// Chainable fake Supabase client. `tables[name]` is a handler map per operation.
function fakeClient({ rpc, tables = {} }) {
  const calls = [];
  const chain = (table, op, payload) => {
    const record = { table, op, payload, filters: [] };
    calls.push(record);
    const resolve = () => {
      const handler = tables[table]?.[op];
      return Promise.resolve(handler ? handler(record) : { data: null, error: null });
    };
    const builder = {
      eq(column, value) { record.filters.push([column, value]); return builder; },
      maybeSingle: resolve,
      then(onFulfilled, onRejected) { return resolve().then(onFulfilled, onRejected); },
    };
    return builder;
  };
  return {
    calls,
    rpc(fn, args) { calls.push({ op: "rpc", fn, args }); return Promise.resolve(rpc(fn, args)); },
    from(table) {
      return {
        select: (cols) => chain(table, "select", cols),
        insert: (row) => chain(table, "insert", row),
        update: (row) => chain(table, "update", row),
      };
    },
  };
}

const CONSUMER = "11111111-1111-4111-8111-111111111111";

test("debit: RPC path returns the new balance and atomic:true", async () => {
  const sb = fakeClient({ rpc: () => ({ data: 95, error: null }) });
  const out = await debitAtomic(sb, CONSUMER, 5, 100);
  assert.deepEqual(out, { ok: true, atomic: true, balance_cents: 95 });
  assert.deepEqual(sb.calls[0], { op: "rpc", fn: "bazaar_debit_balance", args: { p_consumer: CONSUMER, p_cents: 5 } });
  assert.equal(sb.calls.length, 1, "no read-modify-write on the RPC path");
});

test("debit: RPC refuses (NULL) -> ok:false, nothing written", async () => {
  const sb = fakeClient({ rpc: () => ({ data: null, error: null }) });
  const out = await debitAtomic(sb, CONSUMER, 5, 3);
  assert.deepEqual(out, { ok: false, atomic: true, balance_cents: 3 });
  assert.equal(sb.calls.length, 1);
});

for (const code of ["PGRST202", "42883"]) {
  test(`fallback: RPC missing (${code}) -> read-modify-write debit tagged atomic:false`, async () => {
    const sb = fakeClient({
      rpc: () => ({ data: null, error: { code, message: "function not found" } }),
      tables: { bazaar_consumers: { update: () => ({ error: null }) } },
    });
    const out = await debitAtomic(sb, CONSUMER, 5, 100);
    assert.deepEqual(out, { ok: true, atomic: false, balance_cents: 95 });
    const update = sb.calls.find((c) => c.op === "update");
    assert.equal(update.table, "bazaar_consumers");
    assert.equal(update.payload.balance_cents, 95);
    assert.deepEqual(update.filters, [["id", CONSUMER]]);
  });
}

test("debit: other RPC errors throw (never a silent success)", async () => {
  const sb = fakeClient({ rpc: () => ({ data: null, error: { code: "XX000", message: "boom" } }) });
  await assert.rejects(() => debitAtomic(sb, CONSUMER, 5, 100), /debit_failed: boom/);
});

test("debit: zero cost never touches the database", async () => {
  const sb = fakeClient({ rpc: () => { throw new Error("must not be called"); } });
  assert.deepEqual(await debitAtomic(sb, CONSUMER, 0, 7), { ok: true, atomic: true, balance_cents: 7 });
  assert.equal(sb.calls.length, 0);
});

const receiptParams = {
  toolId: "b0771337-b070-4000-b001-000000000001",
  toolName: "wallet.balance",
  agentId: CONSUMER,
  providerId: "b0771337-b070-4000-a000-000000000001",
  durationMs: 42,
  costCents: 5,
  status: "success",
  metadata: { pricing_model: "per_call", atomic_debit: true },
};

test("receipt fields: canonical seven fields, cost_microcents = cents * 10_000, verify_url", async () => {
  let inserted;
  const sb = fakeClient({ tables: { bazaar_receipts: { insert: (c) => { inserted = c.payload; return { error: null }; } } } });
  const receipt = await persistProxyReceipt(sb, receiptParams);
  assert.match(receipt.receipt_id, /^rcpt_[0-9a-f]{16}$/);
  assert.equal(receipt.cost_microcents, 50_000);
  assert.equal(receipt.tool_id, receiptParams.toolId);
  assert.equal(receipt.agent_id, CONSUMER);
  assert.equal(receipt.provider_id, receiptParams.providerId);
  assert.equal(receipt.status, "success");
  assert.equal(receipt.duration_ms, 42);
  assert.equal(receipt.tool_name, "wallet.balance");
  assert.equal(new Date(receipt.timestamp).toISOString(), receipt.timestamp);
  assert.equal(receipt.verify_url, PROXY_RECEIPT_VERIFY_URL);
  assert.equal(receipt.verify_url, "https://noui.bot/verify");
  // Stored row carries the same signed fields plus provenance.
  for (const key of ["receipt_id", "tool_id", "agent_id", "provider_id", "timestamp", "cost_microcents", "status", "signature"]) {
    assert.equal(inserted[key], receipt[key], key);
  }
  assert.equal(inserted.metadata.source, "proxy");
  assert.equal(inserted.metadata.atomic_debit, true);
});

test("receipt verifies: signature passes verifyReceiptEnvelope; tampering the amount fails", async () => {
  const sb = fakeClient({ tables: { bazaar_receipts: { insert: () => ({ error: null }) } } });
  const receipt = await persistProxyReceipt(sb, receiptParams);
  const ok = verifyReceiptEnvelope(receipt);
  assert.equal(ok.valid, true, ok.reason);
  assert.equal(verifyReceiptEnvelope({ ...receipt, cost_microcents: 0 }).reason, "signature_mismatch");
});

test("receipt: free call is still receipted with cost_microcents 0", async () => {
  const sb = fakeClient({ tables: { bazaar_receipts: { insert: () => ({ error: null }) } } });
  const receipt = await persistProxyReceipt(sb, { ...receiptParams, costCents: 0 });
  assert.equal(receipt.cost_microcents, 0);
  assert.equal(verifyReceiptEnvelope(receipt).valid, true);
});

test("receipt: insert failure throws receipt_insert_failed", async () => {
  const sb = fakeClient({ tables: { bazaar_receipts: { insert: () => ({ error: { message: "disk full" } }) } } });
  await assert.rejects(() => persistProxyReceipt(sb, receiptParams), /receipt_insert_failed: disk full/);
});

test("body hash is stable across key order and differs for different bodies", () => {
  const a = hashIdempotencyBody({ tool_name: "x", input: { b: 1, a: [{ d: 2, c: 3 }] } });
  const b = hashIdempotencyBody({ input: { a: [{ c: 3, d: 2 }], b: 1 }, tool_name: "x" });
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, hashIdempotencyBody({ tool_name: "x", input: { b: 2, a: [{ d: 2, c: 3 }] } }));
});

function idempotencyStore(rows = new Map(), { lookupError = null } = {}) {
  return {
    bazaar_idempotency_keys: {
      select: (c) => {
        if (lookupError) return { data: null, error: lookupError };
        const key = c.filters.map(([, v]) => v).join("|");
        const row = rows.get(key);
        return { data: row ? { response: row.response } : null, error: null };
      },
      insert: (c) => { rows.set(`${c.payload.consumer_id}|${c.payload.key}`, c.payload); return { error: null }; },
    },
  };
}

const stored = (bodyHash, body = { ok: 1 }) => ({ body_hash: bodyHash, status: 200, body, headers: { "X-Bazaar-Cost": "5" } });

test("idempotency miss: runs fn once and stores the 2xx response", async () => {
  const rows = new Map();
  const sb = fakeClient({ tables: idempotencyStore(rows) });
  const hash = hashIdempotencyBody({ a: 1 });
  let runs = 0;
  const out = await withIdempotency(sb, CONSUMER, "k1", hash, async () => { runs++; return { response: stored(hash), receiptId: "rcpt_0123456789abcdef" }; });
  assert.equal(out.kind, "fresh");
  assert.equal(out.stored, true);
  assert.equal(runs, 1);
  const row = rows.get(`${CONSUMER}|k1`);
  assert.equal(row.receipt_id, "rcpt_0123456789abcdef");
  assert.deepEqual(row.response, stored(hash));
});

test("idempotency hit: same key + same body returns the stored response without running fn", async () => {
  const rows = new Map();
  const sb = fakeClient({ tables: idempotencyStore(rows) });
  const hash = hashIdempotencyBody({ a: 1 });
  rows.set(`${CONSUMER}|k1`, { consumer_id: CONSUMER, key: "k1", response: stored(hash, { first: true }) });
  const out = await withIdempotency(sb, CONSUMER, "k1", hash, async () => { throw new Error("fn must not run"); });
  assert.equal(out.kind, "replay");
  assert.deepEqual(out.response.body, { first: true });
});

test("idempotency mismatch: same key + different body -> mismatch, fn not run", async () => {
  const rows = new Map();
  const sb = fakeClient({ tables: idempotencyStore(rows) });
  rows.set(`${CONSUMER}|k1`, { consumer_id: CONSUMER, key: "k1", response: stored(hashIdempotencyBody({ a: 1 })) });
  const out = await withIdempotency(sb, CONSUMER, "k1", hashIdempotencyBody({ a: 2 }), async () => { throw new Error("fn must not run"); });
  assert.deepEqual(out, { kind: "mismatch" });
});

test("idempotency: keys are scoped per consumer", async () => {
  const rows = new Map();
  const sb = fakeClient({ tables: idempotencyStore(rows) });
  const hash = hashIdempotencyBody({ a: 1 });
  rows.set(`other|k1`, { consumer_id: "other", key: "k1", response: stored(hash) });
  assert.equal((await lookupIdempotency(sb, CONSUMER, "k1", hash)).kind, "miss");
});

test("idempotency: non-2xx results are not stored, so the key can be retried", async () => {
  const rows = new Map();
  const sb = fakeClient({ tables: idempotencyStore(rows) });
  const hash = hashIdempotencyBody({ a: 1 });
  const out = await withIdempotency(sb, CONSUMER, "k1", hash, async () => ({ response: { ...stored(hash), status: 502 }, receiptId: null }));
  assert.equal(out.kind, "fresh");
  assert.equal(out.stored, false);
  assert.equal(rows.size, 0);
});

test("idempotency: table missing (lookup error) degrades to a plain call, stored:false", async () => {
  const sb = fakeClient({ tables: idempotencyStore(new Map(), { lookupError: { code: "PGRST205", message: "relation missing" } }) });
  const hash = hashIdempotencyBody({ a: 1 });
  const out = await withIdempotency(sb, CONSUMER, "k1", hash, async () => ({ response: stored(hash), receiptId: null }));
  assert.equal(out.kind, "fresh");
  assert.equal(out.stored, false);
  assert.equal(sb.calls.filter((c) => c.op === "insert").length, 0);
});

test("idempotency: no key -> fn runs, nothing looked up or stored", async () => {
  const sb = fakeClient({ tables: idempotencyStore() });
  const out = await withIdempotency(sb, CONSUMER, null, "h", async () => ({ response: stored("h"), receiptId: null }));
  assert.equal(out.kind, "fresh");
  assert.equal(sb.calls.length, 0);
});
