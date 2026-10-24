import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import vm from "node:vm";

process.env.RECEIPT_SIGNING_SECRET = "";
// Node's native TypeScript loader needs the extension that Next's bundler resolves.
const verifierUrl = new URL("../src/lib/receipt-verify.ts", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === verifierUrl && specifier === "./receipts") {
      return nextResolve("./receipts.ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const receiptVerify = await import("../src/lib/receipt-verify.ts");
const { signReceipt } = await import("../src/lib/receipts.ts");
hooks.deregister();

const require = createRequire(import.meta.url);
const ts = require("typescript");

function fakeSupabase(answer) {
  const lookups = [];
  return {
    lookups,
    from(table) {
      const rec = { table, filters: [] };
      lookups.push(rec);
      const b = {
        select() { return b; },
        eq(c, v) { rec.filters.push([c, v]); return b; },
        single: async () => answer,
      };
      return b;
    },
  };
}

async function loadRoute(path, sb) {
  const source = await readFile(new URL(`../src/app/api/v1/bazaar/${path}/route.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Date, Number,
    console: { log() {}, error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/receipt-verify") return receiptVerify;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports.GET;
}

async function get(path, param, sb) {
  const GET = await loadRoute(path, sb);
  const response = await GET(new Request("https://noui.bot/"), { params: Promise.resolve(param) });
  return { status: response.status, body: await response.json() };
}

const RECEIPT_ID = "rcpt_0123456789abcdef";

function signedRow(timestamp) {
  const canonical = {
    receipt_id: RECEIPT_ID,
    tool_id: "weather.now",
    agent_id: "11111111-1111-4111-8111-111111111111",
    provider_id: "22222222-2222-4222-8222-222222222222",
    timestamp,
    cost_microcents: 50_000,
    status: "success",
  };
  return { ...canonical, signature: signReceipt(canonical), tool_name: "Weather", duration_ms: 12 };
}

// How PostgREST renders a TIMESTAMPTZ written from Date#toISOString().
const POSTGREST_FORMS = [
  ["2026-10-22T18:04:05.123Z", "2026-10-22T18:04:05.123+00:00"],
  ["2026-10-22T18:04:05.120Z", "2026-10-22T18:04:05.12+00:00"],
  ["2026-10-22T18:04:05.000Z", "2026-10-22T18:04:05+00:00"],
];

for (const [signed, stored] of POSTGREST_FORMS) {
  test(`receipt lookup: a genuine receipt stored as ${stored} verifies`, async () => {
    const row = { ...signedRow(signed), timestamp: stored };
    const r = await get("receipts/[receiptId]", { receiptId: RECEIPT_ID }, fakeSupabase({ data: row, error: null }));
    assert.equal(r.status, 200);
    assert.equal(r.body.verification.valid, true);
    assert.equal(r.body.verification.reason, "ok");
    // The returned receipt is the signed form, so it re-verifies through /api/v1/verify.
    assert.equal(r.body.receipt.timestamp, signed);
    assert.equal(receiptVerify.verifyReceiptEnvelope(r.body.receipt).valid, true);
  });
}

test("receipt lookup: a tampered amount does not verify", async () => {
  const row = { ...signedRow("2026-10-22T18:04:05.123Z"), cost_microcents: 1 };
  const r = await get("receipts/[receiptId]", { receiptId: RECEIPT_ID }, fakeSupabase({ data: row, error: null }));
  assert.equal(r.status, 200);
  assert.equal(r.body.verification.valid, false);
  assert.equal(r.body.verification.reason, "signature_mismatch");
});

test("receipt lookup: a row with null signed fields reports invalid instead of crashing", async () => {
  const row = { ...signedRow("2026-10-22T18:04:05.123Z"), cost_microcents: null, signature: null };
  const r = await get("receipts/[receiptId]", { receiptId: RECEIPT_ID }, fakeSupabase({ data: row, error: null }));
  assert.equal(r.status, 200);
  assert.equal(r.body.verification.valid, false);
  assert.equal(r.body.verification.reason, "missing_fields");
});

test("receipt lookup: a database failure is a 503, not a 404 for a receipt that exists", async () => {
  const sb = fakeSupabase({ data: null, error: { code: "08006", message: "connection failure" } });
  const r = await get("receipts/[receiptId]", { receiptId: RECEIPT_ID }, sb);
  assert.equal(r.status, 503);
  assert.doesNotMatch(JSON.stringify(r.body), /connection failure/);
});

test("receipt lookup: no row is a 404", async () => {
  const sb = fakeSupabase({ data: null, error: { code: "PGRST116", message: "0 rows" } });
  const r = await get("receipts/[receiptId]", { receiptId: RECEIPT_ID }, sb);
  assert.equal(r.status, 404);
  assert.equal(r.body.code, "NOT_FOUND");
});

test("receipt lookup: a malformed ID is a 404 without a database query", async () => {
  for (const receiptId of ["rcpt_a1b2", "rcpt_0123456789ABCDEF", "x".repeat(5000), "rcpt_0123456789abcdef,receipt_id.neq.x"]) {
    const sb = fakeSupabase({ data: signedRow("2026-10-22T18:04:05.123Z"), error: null });
    const r = await get("receipts/[receiptId]", { receiptId }, sb);
    assert.equal(r.status, 404, receiptId.slice(0, 40));
    assert.equal(sb.lookups.length, 0);
  }
});

const DISPUTE_ID = "disp_0123456789abcdef";

test("dispute lookup: an existing dispute is returned", async () => {
  const sb = fakeSupabase({ data: { dispute_id: DISPUTE_ID, receipt_id: RECEIPT_ID, status: "open" }, error: null });
  const r = await get("disputes/[id]", { id: DISPUTE_ID }, sb);
  assert.equal(r.status, 200);
  assert.equal(r.body.dispute_id, DISPUTE_ID);
  assert.deepEqual(sb.lookups[0].filters, [["dispute_id", DISPUTE_ID]]);
});

test("dispute lookup: a database failure is a 503 and no row is a 404", async () => {
  let r = await get("disputes/[id]", { id: DISPUTE_ID }, fakeSupabase({ data: null, error: { code: "57014", message: "timeout" } }));
  assert.equal(r.status, 503);
  r = await get("disputes/[id]", { id: DISPUTE_ID }, fakeSupabase({ data: null, error: { code: "PGRST116", message: "0 rows" } }));
  assert.equal(r.status, 404);
});

test("dispute lookup: a malformed ID is a 404 without a database query", async () => {
  const sb = fakeSupabase({ data: null, error: null });
  const r = await get("disputes/[id]", { id: "<script>" }, sb);
  assert.equal(r.status, 404);
  assert.equal(sb.lookups.length, 0);
  assert.doesNotMatch(r.body.message, /<script>/);
});
