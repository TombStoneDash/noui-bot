import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}

const source = await readFile(new URL("../src/app/api/v1/bazaar/disputes/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const AGENT = { id: "consumer-1", type: "consumer" };
const RECEIPT_ID = "rcpt_0123456789abcdef";
const RECEIPT = { receipt_id: RECEIPT_ID, agent_id: "consumer-1", provider_id: "provider-1" };

// Fake Supabase: each table returns the configured result for its terminal call.
function client({ receipt = RECEIPT, receiptError = null, existing = [], existingError = null, insertError = null, listError = null }) {
  const inserts = [];
  const calls = [];
  return {
    inserts,
    calls,
    from(table) {
      const builder = {
        select: () => builder,
        eq: (...args) => { calls.push(["eq", ...args]); return builder; },
        not: () => builder,
        order: () => builder,
        range: () => builder,
        single: async () => (receipt
          ? { data: receipt, error: null }
          : { data: null, error: receiptError ?? { code: "PGRST116", message: "no rows" } }),
        limit: async () => ({ data: existingError ? null : existing, error: existingError }),
        insert: async (row) => {
          if (!insertError) inserts.push({ table, row });
          return { error: insertError };
        },
        then: (resolve) => resolve({ data: listError ? null : [], count: 0, error: listError }),
      };
      if (table === "bazaar_receipts" && receiptError) {
        builder.single = async () => ({ data: null, error: receiptError });
      }
      return builder;
    },
  };
}

function load(sb, owner = AGENT) {
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => owner };
      if (name === "@/lib/pagination") return { parsePagination: () => ({ limit: 50, offset: 0 }) };
      if (name === "@/lib/receipts") return { generateDisputeId: () => "disp_0000000000000001" };
      throw new Error(`Unexpected import: ${name}`);
    },
    console: { error() {} },
    Response,
    Date,
    URL,
    TextEncoder,
  });
  vm.runInContext(outputText, context);
  return context.exports;
}

async function file(body, options = {}) {
  const sb = client(options);
  const { POST } = load(sb, options.owner);
  const response = await POST(new Request("https://noui.bot/api/v1/bazaar/disputes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }));
  return { status: response.status, json: await response.json(), inserts: sb.inserts };
}

const valid = { receipt_id: RECEIPT_ID, reason: "overcharge", description: "Charged twice", evidence: { calls: 2 } };

test("a party to the receipt can file a dispute", async () => {
  const out = await file(valid);
  assert.equal(out.status, 201);
  assert.equal(out.json.dispute_id, "disp_0000000000000001");
  assert.equal(out.inserts.length, 1);
  assert.equal(out.inserts[0].row.filed_by_type, "agent");
  assert.deepEqual(out.inserts[0].row.evidence, { calls: 2 });
});

test("description and evidence are optional", async () => {
  const out = await file({ receipt_id: RECEIPT_ID, reason: "timeout" });
  assert.equal(out.status, 201);
  assert.equal(out.inserts[0].row.description, null);
  assert.equal(JSON.stringify(out.inserts[0].row.evidence), "{}"); // object from the vm realm
});

for (const [name, body] of [["null", "null"], ["array", "[]"], ["string", '"x"'], ["broken JSON", "{"]]) {
  test(`400 on a ${name} body`, async () => {
    const out = await file(body);
    assert.equal(out.status, 400);
    assert.equal(out.inserts.length, 0);
  });
}

for (const [name, patch] of [
  ["missing receipt_id", { receipt_id: undefined }],
  ["numeric receipt_id", { receipt_id: 42 }],
  ["object receipt_id", { receipt_id: { $ne: null } }],
  ["unknown reason", { reason: "vibes" }],
  ["numeric description", { description: 5 }],
  ["huge description", { description: "x".repeat(5_001) }],
  ["array evidence", { evidence: [1, 2] }],
  ["string evidence", { evidence: "see attached" }],
  ["huge evidence", { evidence: { blob: "x".repeat(20_000) } }],
]) {
  test(`422 on ${name}`, async () => {
    const out = await file({ ...valid, ...patch });
    assert.equal(out.status, 422);
    assert.equal(out.json.code, "VALIDATION_ERROR");
    assert.equal(out.inserts.length, 0);
  });
}

test("a receipt_id that is not a receipt ID is a 404 without a lookup", async () => {
  const out = await file({ ...valid, receipt_id: "not-a-receipt" });
  assert.equal(out.status, 404);
});

test("an unknown receipt is a 404", async () => {
  const out = await file(valid, { receipt: null });
  assert.equal(out.status, 404);
  assert.equal(out.json.code, "NOT_FOUND");
});

test("a receipt lookup failure is a 503, not 'not found'", async () => {
  const out = await file(valid, { receipt: null, receiptError: { code: "08006", message: "db-host-3 down" } });
  assert.equal(out.status, 503);
  assert.equal(out.json.code, "SERVICE_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(out.json), /db-host-3/);
});

test("a stranger to the receipt cannot file", async () => {
  const out = await file(valid, { owner: { id: "consumer-2", type: "consumer" } });
  assert.equal(out.status, 403);
  assert.equal(out.inserts.length, 0);
});

test("an active dispute blocks a second one", async () => {
  const out = await file(valid, { existing: [{ dispute_id: "disp_1111111111111111" }] });
  assert.equal(out.status, 409);
  assert.equal(out.inserts.length, 0);
});

test("a failed duplicate check refuses instead of filing a possible duplicate", async () => {
  const out = await file(valid, { existingError: { message: "timeout" } });
  assert.equal(out.status, 503);
  assert.equal(out.inserts.length, 0);
});

test("an insert failure does not echo the database error", async () => {
  const out = await file(valid, { insertError: { message: 'new row violates check constraint "secret_check"' } });
  assert.equal(out.status, 503);
  assert.doesNotMatch(JSON.stringify(out.json), /secret_check/);
});

async function list(qs, options = {}) {
  const sb = client(options);
  const { GET } = load(sb, options.owner);
  const response = await GET(new Request(`https://noui.bot/api/v1/bazaar/disputes?${qs}`));
  return { status: response.status, json: await response.json(), calls: sb.calls };
}

test("list: a known status filter is applied", async () => {
  const out = await list("status=filed");
  assert.equal(out.status, 200);
  assert.deepEqual(out.calls.find((c) => c[1] === "status"), ["eq", "status", "filed"]);
});

test("list: an unknown status is a 400", async () => {
  const out = await list("status=open");
  assert.equal(out.status, 400);
  assert.equal(out.calls.length, 0);
});

test("list: a database error is a 503 without details", async () => {
  const out = await list("", { listError: { message: "relation bazaar_disputes_secret" } });
  assert.equal(out.status, 503);
  assert.doesNotMatch(JSON.stringify(out.json), /secret/);
});
