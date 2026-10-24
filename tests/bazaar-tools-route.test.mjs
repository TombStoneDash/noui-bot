import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import * as priceCents from "../src/lib/price-cents.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const PROVIDER = "22222222-2222-4222-8222-222222222222";
const provider = { id: PROVIDER, type: "provider" };

// Fake Supabase that records every write and answers each table/op from `answers`.
function fakeSupabase(answers = {}) {
  const writes = [];
  const builder = (table, op, payload) => {
    const rec = { table, op, payload, filters: [] };
    if (op !== "select") writes.push(rec);
    const resolve = () => Promise.resolve(answers[`${table}.${op}`]?.(rec) ?? { data: null, error: null });
    const b = {
      eq(c, v) { rec.filters.push([c, v]); return b; },
      select() { return b; },
      single: resolve,
      maybeSingle: resolve,
      then(f, r) { return resolve().then(f, r); },
    };
    return b;
  };
  return {
    writes,
    from(table) {
      return {
        select: (cols) => builder(table, "select", cols),
        insert: (row) => builder(table, "insert", row),
        update: (row) => builder(table, "update", row),
      };
    },
  };
}

const source = await readFile(new URL("../src/app/api/bazaar/tools/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(sb, owner = provider) {
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, console: { error() {}, log() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/price-cents") return priceCents;
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => owner };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return async (body, raw = false) => {
    const response = await exports.POST(new Request("https://noui.bot/api/bazaar/tools", {
      method: "POST", headers: { "content-type": "application/json" }, body: raw ? body : JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  };
}

const created = { "bazaar_tools.insert": (rec) => ({ data: { id: "tool-new", ...rec.payload }, error: null }) };
const existingTool = {
  "bazaar_tools.select": () => ({ data: { id: "tool-1" }, error: null }),
  "bazaar_tools.update": (rec) => ({ data: { id: "tool-1", tool_name: "weather.now", ...rec.payload }, error: null }),
};

test("tools: non-object bodies are a 400, not a TypeError 500", async () => {
  for (const raw of ["null", "[]", "7"]) {
    const sb = fakeSupabase(created);
    const r = await loadRoute(sb)(raw, true);
    assert.equal(r.status, 400, raw);
    assert.equal(sb.writes.length, 0);
  }
});

test("tools: one malformed entry is reported without failing the rest of the batch", async () => {
  const sb = fakeSupabase(created);
  const r = await loadRoute(sb)({ tools: [null, "weather.now", { tool_name: 5 }, { tool_name: "ok.tool" }] });
  assert.equal(r.status, 201);
  assert.equal(r.body.registered, 1);
  assert.equal(r.body.errors, 3);
  assert.deepEqual(sb.writes.map((w) => w.payload.tool_name), ["ok.tool"]);
});

test("tools: field types are checked before anything is written", async () => {
  for (const tool of [
    { tool_name: "t", description: { a: 1 } },
    { tool_name: "t", category: 3 },
    { tool_name: "t", input_schema: "string" },
    { tool_name: "t", pricing: "free" },
    { tool_name: "t", pricing: { price_cents: -1 } },
    { tool_name: "t", pricing: { free_tier_calls: -10 } },
    { tool_name: "t", pricing: { free_tier_calls: "100" } },
    { tool_name: "t", pricing: { free_tier_calls: 2.5 } },
    { tool_name: "x".repeat(201) },
  ]) {
    const sb = fakeSupabase(created);
    const r = await loadRoute(sb)({ tools: [tool] });
    assert.equal(r.status, 422, JSON.stringify(tool).slice(0, 80));
    assert.equal(sb.writes.length, 0);
  }
});

test("tools: re-registering applies pricing.price_cents and free_tier_calls instead of silently ignoring them", async () => {
  const sb = fakeSupabase(existingTool);
  const r = await loadRoute(sb)({ tools: [{ tool_name: "weather.now", pricing: { price_cents: 12, free_tier_calls: 50 } }] });
  assert.equal(r.status, 201);
  assert.equal(r.body.tools[0].action, "updated");
  assert.equal(sb.writes[0].payload.price_cents_override, 12);
  assert.equal(sb.writes[0].payload.free_tier_calls, 50);
});

test("tools: an update without pricing leaves price and free tier unchanged", async () => {
  const sb = fakeSupabase(existingTool);
  await loadRoute(sb)({ tools: [{ tool_name: "weather.now", description: "Now with wind" }] });
  const payload = sb.writes[0].payload;
  assert.equal(payload.price_cents_override, undefined);
  assert.equal(payload.free_tier_calls, undefined);
  assert.equal(payload.description, "Now with wind");
});

test("tools: an explicit null override resets an existing tool to the provider default", async () => {
  const sb = fakeSupabase(existingTool);
  await loadRoute(sb)({ tools: [{ tool_name: "weather.now", price_cents_override: null }] });
  assert.equal(sb.writes[0].payload.price_cents_override, null);
});

test("tools: price_cents_override wins over pricing.price_cents on create", async () => {
  const sb = fakeSupabase(created);
  await loadRoute(sb)({ tools: [{ tool_name: "t", price_cents_override: 0, pricing: { price_cents: 9, free_tier_calls: 0 } }] });
  assert.equal(sb.writes[0].payload.price_cents_override, 0);
  assert.equal(sb.writes[0].payload.free_tier_calls, 0);
});

test("tools: a failed lookup does not insert blind, and database errors are not echoed", async () => {
  const sb = fakeSupabase({ ...created, "bazaar_tools.select": () => ({ data: null, error: { message: "relation \"bazaar_tools\" timeout" } }) });
  const r = await loadRoute(sb)({ tools: [{ tool_name: "weather.now" }] });
  assert.equal(r.status, 422);
  assert.equal(sb.writes.length, 0, "no insert when the duplicate check failed");
  assert.doesNotMatch(JSON.stringify(r.body), /relation|timeout/);

  const sb2 = fakeSupabase({ "bazaar_tools.insert": () => ({ data: null, error: { message: "duplicate key violates bazaar_tools_provider_id_tool_name_key" } }) });
  const r2 = await loadRoute(sb2)({ tools: [{ tool_name: "weather.now" }] });
  assert.equal(r2.status, 422);
  assert.doesNotMatch(JSON.stringify(r2.body), /duplicate key|bazaar_tools_/);
});

test("tools: consumer keys are refused", async () => {
  const sb = fakeSupabase(created);
  const r = await loadRoute(sb, { id: "c", type: "consumer" })({ tools: [{ tool_name: "t" }] });
  assert.equal(r.status, 401);
  assert.equal(sb.writes.length, 0);
});
