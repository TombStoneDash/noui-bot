import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import vm from "node:vm";

process.env.RECEIPT_SIGNING_SECRET = "";
const require = createRequire(import.meta.url);
const ts = require("typescript");

// Real billing kernel + signer + verifier (Node strips the types natively).
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
const receipts = await import("../src/lib/receipts.ts");
const { verifyReceiptEnvelope } = await import("../src/lib/receipt-verify.ts");
hooks.deregister();

const source = await readFile(new URL("../src/app/api/bazaar/proxy/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const CONSUMER = "11111111-1111-4111-8111-111111111111";
const PROVIDER = "22222222-2222-4222-8222-222222222222";
const TOOL = "33333333-3333-4333-8333-333333333333";

/**
 * Fake Supabase. Tables hold rows; the builder records ops and answers:
 *  - bazaar_usage_logs select(count) -> recent calls (0)
 *  - bazaar_tools select.single -> the fixture tool
 *  - bazaar_idempotency_keys select.maybeSingle / insert -> in-memory map
 *  - bazaar_receipts insert -> rows (or injected failure)
 *  - bazaar_consumers update -> fallback debit
 *  - rpc bazaar_debit_balance -> configurable (missing / balance gate)
 */
function fakeSupabase({ priceCents = 5, balance = 100, rpcMissing = false, receiptInsertError = null } = {}) {
  const state = {
    balance,
    usageLogs: [],
    receipts: [],
    idempotency: new Map(),
    consumerUpdates: [],
    rpcCalls: 0,
    tool: {
      id: TOOL, tool_name: "wallet.balance", active: true, price_cents_override: priceCents,
      pricing_model_override: null, call_count: 0, avg_latency_ms: null,
      bazaar_providers: { id: PROVIDER, name: "Fixture Co", endpoint_url: "https://provider.test/mcp", pricing_model: "per_call", default_price_cents: 0, active: true },
    },
  };
  const builder = (table, op, payload) => {
    const rec = { table, op, payload, filters: [] };
    const resolve = () => Promise.resolve(answer(rec));
    const b = {
      eq(c, v) { rec.filters.push([c, v]); return b; },
      gte() { return b; },
      order() { return b; },
      limit() { return b; },
      single: resolve,
      maybeSingle: resolve,
      then(f, r) { return resolve().then(f, r); },
    };
    return b;
  };
  function answer(rec) {
    const { table, op, payload, filters } = rec;
    if (table === "bazaar_usage_logs" && op === "select") return { count: 0, data: [], error: null };
    if (table === "bazaar_usage_logs" && op === "insert") { state.usageLogs.push(payload); return { error: null }; }
    if (table === "bazaar_tools" && op === "select") return { data: state.tool, error: null };
    if (table === "bazaar_tools" && op === "update") return { error: null };
    if (table === "bazaar_receipts" && op === "insert") {
      if (receiptInsertError) return { error: { message: receiptInsertError } };
      state.receipts.push(payload); return { error: null };
    }
    if (table === "bazaar_idempotency_keys") {
      // (consumer_id, key) is the primary key, as in sql/008.
      const k = op === "insert" ? `${payload.consumer_id}|${payload.key}` : filters.map(([, v]) => v).join("|");
      const row = state.idempotency.get(k);
      if (op === "select") return { data: row ? { response: row.response } : null, error: null };
      if (op === "insert") {
        if (row) return { error: { code: "23505", message: "duplicate key value" } };
        state.idempotency.set(k, payload); return { error: null };
      }
      if (op === "update") { if (row) Object.assign(row, payload); return { error: null }; }
      if (op === "delete") { state.idempotency.delete(k); return { error: null }; }
    }
    if (table === "bazaar_consumers" && op === "update") { state.consumerUpdates.push(payload); state.balance = payload.balance_cents; return { error: null }; }
    throw new Error(`unexpected ${table}.${op}`);
  }
  const sb = {
    state,
    from(table) {
      return {
        select: (cols, opts) => builder(table, "select", { cols, opts }),
        insert: (row) => builder(table, "insert", row),
        update: (row) => builder(table, "update", row),
        delete: () => builder(table, "delete"),
      };
    },
    async rpc(fn, args) {
      state.rpcCalls++;
      assert.equal(fn, "bazaar_debit_balance");
      if (rpcMissing) return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
      // Atomic conditional debit, evaluated synchronously like a row lock would.
      if (state.balance >= args.p_cents) { state.balance -= args.p_cents; return { data: state.balance, error: null }; }
      return { data: null, error: null };
    },
  };
  return sb;
}

function loadRoute({ sb, upstream, env = {} }) {
  const upstreamCalls = [];
  const fetch = async (url, init) => {
    upstreamCalls.push({ url, init });
    const r = await upstream(url, init);
    return { ok: r.status < 400, status: r.status, text: async () => JSON.stringify(r.body) };
  };
  const context = vm.createContext({
    exports: {},
    console, Date, Promise, TextEncoder, AbortSignal, Response, crypto, setTimeout,
    process: { env: { ...process.env, ...env } },
    fetch,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => ({ id: CONSUMER, type: "consumer", balance_cents: sb.state.balance, rate_limit_rpm: 60 }) };
      if (name === "@/lib/proxy-billing") return billing;
      if (name === "@/lib/receipts") return {
        ...receipts,
        // requireSigningSecret reads process.env; make it see the vm's env.
        requireSigningSecret() {
          const saved = { NODE_ENV: process.env.NODE_ENV, RECEIPT_SIGNING_ENFORCE: process.env.RECEIPT_SIGNING_ENFORCE, RECEIPT_SIGNING_SECRET: process.env.RECEIPT_SIGNING_SECRET };
          for (const k of Object.keys(saved)) { if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; }
          try { return receipts.requireSigningSecret(); } finally {
            for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
          }
        },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  const POST = context.exports.POST;
  const call = async (body, headers = {}) => {
    const response = await POST(new Request("https://noui.bot/api/bazaar/proxy", {
      method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
    }));
    const text = await response.text();
    return { status: response.status, headers: Object.fromEntries(response.headers), text, body: JSON.parse(text) };
  };
  return { call, upstreamCalls };
}

const okUpstream = async () => ({ status: 200, body: { jsonrpc: "2.0", id: "1", result: { content: [{ type: "text", text: "42" }] } } });
const REQUEST = { tool_id: TOOL, input: { account: "a" } };

test("success: billed call debits once, persists a verifying receipt, exposes meta.receipt + X-Bazaar-Receipt", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream });
  const r = await call(REQUEST);
  assert.equal(r.status, 200, r.text);
  assert.equal(upstreamCalls.length, 1);
  assert.equal(sb.state.balance, 95);
  assert.equal(r.body.meta.remaining_balance_cents, 95);
  assert.equal(r.body.meta.cost_cents, 5);
  assert.equal(r.body.meta.receipt_persisted, true);
  assert.equal(sb.state.receipts.length, 1);
  const receipt = r.body.meta.receipt;
  assert.equal(receipt.cost_microcents, 5 * 10_000);
  assert.equal(receipt.agent_id, CONSUMER);
  assert.equal(receipt.verify_url, "https://noui.bot/verify");
  assert.equal(verifyReceiptEnvelope(receipt).valid, true);
  assert.equal(verifyReceiptEnvelope(sb.state.receipts[0]).valid, true);
  assert.equal(r.headers["x-bazaar-receipt"], receipt.receipt_id);
  assert.equal(sb.state.usageLogs.length, 1);
  assert.equal(sb.state.usageLogs[0].metadata.receipt_id, receipt.receipt_id);
  assert.equal(sb.state.usageLogs[0].metadata.atomic_debit, true);
  assert.equal(sb.state.consumerUpdates.length, 0, "no read-modify-write when the RPC exists");
});

test("replay: same Idempotency-Key + same body -> one upstream call, one debit, identical body, replay header", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream });
  const first = await call(REQUEST, { "Idempotency-Key": "order-1" });
  assert.equal(first.status, 200, first.text);
  const second = await call({ input: { account: "a" }, tool_id: TOOL }, { "Idempotency-Key": "order-1" });
  assert.equal(second.status, 200);
  assert.equal(second.text, first.text, "byte-identical body");
  assert.equal(second.headers["x-bazaar-idempotent-replay"], "true");
  assert.equal(first.headers["x-bazaar-idempotent-replay"], undefined);
  assert.equal(second.headers["x-bazaar-receipt"], first.headers["x-bazaar-receipt"]);
  assert.equal(upstreamCalls.length, 1);
  assert.equal(sb.state.rpcCalls, 1);
  assert.equal(sb.state.balance, 95);
  assert.equal(sb.state.usageLogs.length, 1);
  assert.equal(sb.state.receipts.length, 1);
  assert.equal(sb.state.idempotency.get(`${CONSUMER}|order-1`).receipt_id, first.body.meta.receipt.receipt_id);
});

test("mismatch: same key + different body -> 409 IDEMPOTENCY_MISMATCH, no upstream call, no debit", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream });
  await call(REQUEST, { "Idempotency-Key": "order-1" });
  const r = await call({ tool_id: TOOL, input: { account: "b" } }, { "Idempotency-Key": "order-1" });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, "IDEMPOTENCY_MISMATCH");
  assert.equal(upstreamCalls.length, 1);
  assert.equal(sb.state.balance, 95);
});

test("Idempotency-Key longer than 128 chars -> 400 BAD_REQUEST before any upstream call", async () => {
  const sb = fakeSupabase();
  const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream });
  const r = await call(REQUEST, { "Idempotency-Key": "k".repeat(129) });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, "BAD_REQUEST");
  assert.equal(upstreamCalls.length, 0);
});

test("concurrency: five billed calls, balance for one -> exactly one 200 and four 402 on the RPC path", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 5 });
  const { call } = loadRoute({ sb, upstream: okUpstream });
  const results = await Promise.all(Array.from({ length: 5 }, () => call(REQUEST)));
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 402, 402, 402, 402]);
  assert.equal(sb.state.balance, 0);
  assert.equal(sb.state.receipts.length, 1);
  const refused = results.filter((r) => r.status === 402);
  for (const r of refused) assert.equal(r.body.code, "INSUFFICIENT_FUNDS");
  assert.equal(sb.state.usageLogs.filter((l) => l.status === "insufficient_funds").length, 4);
  assert.equal(sb.state.usageLogs.filter((l) => l.status === "success").length, 1);
});

test("fallback: RPC absent (PGRST202) -> read-modify-write debit, usage log metadata.atomic_debit=false", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100, rpcMissing: true });
  const { call } = loadRoute({ sb, upstream: okUpstream });
  const r = await call(REQUEST);
  assert.equal(r.status, 200, r.text);
  assert.equal(sb.state.consumerUpdates.length, 1);
  assert.equal(sb.state.consumerUpdates[0].balance_cents, 95);
  assert.equal(r.body.meta.remaining_balance_cents, 95);
  assert.equal(sb.state.usageLogs[0].metadata.atomic_debit, false);
  assert.equal(sb.state.receipts[0].metadata.atomic_debit, false);
});

test("receipt failure: insert error -> 200 with receipt:null, receipt_persisted:false, metadata.receipt_error logged, never 500", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100, receiptInsertError: "disk full" });
  const { call } = loadRoute({ sb, upstream: okUpstream });
  const r = await call(REQUEST);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.body.meta.receipt, null);
  assert.equal(r.body.meta.receipt_persisted, false);
  assert.equal(r.headers["x-bazaar-receipt"], undefined);
  assert.equal(sb.state.balance, 95, "the call was billed; the response says the receipt is missing");
  assert.match(sb.state.usageLogs[0].metadata.receipt_error, /receipt_insert_failed: disk full/);
  assert.equal(sb.state.usageLogs[0].metadata.receipt_id, null);
});

test("free tool: no debit, receipt still written with cost_microcents 0", async () => {
  const sb = fakeSupabase({ priceCents: 0, balance: 0 });
  const { call } = loadRoute({ sb, upstream: okUpstream });
  const r = await call(REQUEST);
  assert.equal(r.status, 200, r.text);
  assert.equal(sb.state.rpcCalls, 0);
  assert.equal(r.body.meta.cost, "Free");
  assert.equal(r.body.meta.receipt.cost_microcents, 0);
  assert.equal(verifyReceiptEnvelope(r.body.meta.receipt).valid, true);
});

test("upstream failure: 502, cost 0, no receipt, no debit, and the key is not consumed", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  let n = 0;
  const upstream = async () => (n++ < 2 ? { status: 503, body: { error: "down" } } : okUpstream());
  const { call, upstreamCalls } = loadRoute({ sb, upstream });
  const r = await call(REQUEST, { "Idempotency-Key": "retry-me" });
  assert.equal(r.status, 502);
  assert.equal(upstreamCalls.length, 2, "one retry on 5xx");
  assert.equal(sb.state.balance, 100);
  assert.equal(sb.state.receipts.length, 0);
  assert.equal(sb.state.idempotency.size, 0);
  const again = await call(REQUEST, { "Idempotency-Key": "retry-me" });
  assert.equal(again.status, 200, again.text);
  assert.equal(again.headers["x-bazaar-idempotent-replay"], undefined);
});

test("NODE_ENV=production + enforce on + no secret -> 503 RECEIPT_SIGNING_UNAVAILABLE before any upstream call", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream, env: { NODE_ENV: "production", RECEIPT_SIGNING_ENFORCE: "true", RECEIPT_SIGNING_SECRET: undefined } });
  const r = await call(REQUEST);
  assert.equal(r.status, 503);
  assert.equal(r.body.code, "RECEIPT_SIGNING_UNAVAILABLE");
  assert.equal(upstreamCalls.length, 0);
  assert.equal(sb.state.balance, 100);
  assert.equal(sb.state.usageLogs.length, 0);
});

test("NODE_ENV=production + RECEIPT_SIGNING_ENFORCE=false + no secret -> proceeds", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream, env: { NODE_ENV: "production", RECEIPT_SIGNING_ENFORCE: "false", RECEIPT_SIGNING_SECRET: undefined } });
  const r = await call(REQUEST);
  assert.equal(r.status, 200, r.text);
  assert.equal(upstreamCalls.length, 1);
});

test("JSON-RPC error inside HTTP 200 -> 502 PROVIDER_ERROR, no debit, no receipt, key not consumed", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const upstream = async () => ({ status: 200, body: { jsonrpc: "2.0", id: "1", error: { code: -32602, message: "Unknown tool" } } });
  const { call } = loadRoute({ sb, upstream });
  const r = await call(REQUEST, { "Idempotency-Key": "rpc-error" });
  assert.equal(r.status, 502, r.text);
  assert.equal(r.body.code, "PROVIDER_ERROR");
  assert.equal(r.body.message, "Provider returned JSON-RPC error -32602: Unknown tool");
  assert.equal(r.body.cost_cents, 0);
  assert.equal(r.headers["x-bazaar-cost"], "0");
  assert.equal(sb.state.rpcCalls, 0);
  assert.equal(sb.state.balance, 100);
  assert.equal(sb.state.receipts.length, 0);
  assert.equal(sb.state.idempotency.size, 0);
  assert.equal(sb.state.usageLogs[0].status, "error");
  assert.equal(sb.state.usageLogs[0].cost_cents, 0);
});

test("upstream 200 with a null body -> 502, not billed, never a 500 after the debit", async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  const { call } = loadRoute({ sb, upstream: async () => ({ status: 200, body: null }) });
  const r = await call(REQUEST);
  assert.equal(r.status, 502, r.text);
  assert.equal(r.body.message, "Provider returned an empty response");
  assert.equal(sb.state.balance, 100);
});

test("falsy JSON-RPC result is passed through as the result, not the whole envelope", async () => {
  const sb = fakeSupabase({ priceCents: 0, balance: 0 });
  const { call } = loadRoute({ sb, upstream: async () => ({ status: 200, body: { jsonrpc: "2.0", id: "1", result: 0 } }) });
  const r = await call(REQUEST);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.body.result, 0);
});

for (const [label, payload] of [["null", null], ["an array", [REQUEST]], ["a string", "tool"]]) {
  test(`request body that is ${label} -> 400 BAD_REQUEST, not a 500`, async () => {
    const sb = fakeSupabase();
    const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream });
    const r = await call(payload);
    assert.equal(r.status, 400, r.text);
    assert.equal(r.body.code, "BAD_REQUEST");
    assert.equal(upstreamCalls.length, 0);
  });
}

for (const [label, payload] of [
  ["input is a string", { tool_id: TOOL, input: "account=a" }],
  ["input is an array", { tool_id: TOOL, input: ["a"] }],
  ["tool_id is a number", { tool_id: 7, input: {} }],
]) {
  test(`${label} -> 422 VALIDATION_ERROR before any upstream call`, async () => {
    const sb = fakeSupabase();
    const { call, upstreamCalls } = loadRoute({ sb, upstream: okUpstream });
    const r = await call(payload);
    assert.equal(r.status, 422, r.text);
    assert.equal(r.body.code, "VALIDATION_ERROR");
    assert.equal(upstreamCalls.length, 0);
  });
}

test("concurrent: two requests with the same Idempotency-Key -> one upstream call, one debit", { timeout: 5_000 }, async () => {
  const sb = fakeSupabase({ priceCents: 5, balance: 100 });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { call, upstreamCalls } = loadRoute({ sb, upstream: async () => { await gate; return okUpstream(); } });
  const first = call(REQUEST, { "Idempotency-Key": "order-race" });
  // Let the first request reach the upstream call before the second arrives.
  while (upstreamCalls.length === 0) await new Promise((resolve) => setTimeout(resolve, 1));
  const second = await call(REQUEST, { "Idempotency-Key": "order-race" });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "IDEMPOTENCY_IN_PROGRESS");
  assert.equal(second.headers["retry-after"], "2");
  release();
  assert.equal((await first).status, 200);
  assert.equal(upstreamCalls.length, 1);
  assert.equal(sb.state.balance, 95, "billed once");
  const third = await call(REQUEST, { "Idempotency-Key": "order-race" });
  assert.equal(third.status, 200);
  assert.equal(third.headers["x-bazaar-idempotent-replay"], "true");
});
