import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import * as priceCents from "../src/lib/price-cents.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const PROVIDER = "22222222-2222-4222-8222-222222222222";

// Fake Supabase that records every write and answers each table/op from `answers`.
function fakeSupabase(answers = {}) {
  const writes = [];
  const builder = (table, op, payload) => {
    const rec = { table, op, payload, filters: [] };
    writes.push(rec);
    const resolve = () => Promise.resolve(answers[`${table}.${op}`]?.(rec) ?? { data: null, error: null });
    const b = {
      eq(c, v) { rec.filters.push([c, v]); return b; },
      select() { return b; },
      single: resolve,
      then(f, r) { return resolve().then(f, r); },
    };
    return b;
  };
  return {
    writes,
    from(table) {
      return {
        insert: (row) => builder(table, "insert", row),
        delete: () => builder(table, "delete"),
      };
    },
  };
}

const source = await readFile(new URL("../src/app/api/bazaar/register-provider/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(sb) {
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, URL, console: { error() {}, log() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/price-cents") return priceCents;
      if (name === "@/lib/bazaar-auth") return { generateBazaarKey: () => ({ key: "bz_test", hash: "hash", prefix: "bz_te" }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return async (body, raw = false) => {
    const response = await exports.POST(new Request("https://noui.bot/api/bazaar/register-provider", {
      method: "POST", headers: { "content-type": "application/json" }, body: raw ? body : JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  };
}

const okAnswers = {
  "bazaar_providers.insert": (rec) => ({ data: { id: PROVIDER, ...rec.payload }, error: null }),
  "bazaar_tools.insert": (rec) => ({ data: { id: `tool-${rec.payload.tool_name}`, ...rec.payload }, error: null }),
};
const valid = { name: "Weather Co", email: "p@example.test", endpoint_url: "https://weather.test/mcp" };

test("register-provider: non-object JSON bodies are a 400, not a TypeError 500", async () => {
  for (const raw of ["null", "[]", "42", "\"provider\""]) {
    const sb = fakeSupabase(okAnswers);
    const r = await loadRoute(sb)(raw, true);
    assert.equal(r.status, 400, raw);
    assert.equal(r.body.code, "BAD_REQUEST");
    assert.equal(sb.writes.length, 0);
  }
});

test("register-provider: malformed fields are refused before anything is created", async () => {
  for (const body of [
    { ...valid, name: 42 },
    { ...valid, name: "x".repeat(201) },
    { ...valid, email: ["p@example.test"] },
    { ...valid, email: "not-an-email" },
    { ...valid, endpoint_url: "weather.test/mcp" },
    { ...valid, endpoint_url: "file:///etc/passwd" },
    { ...valid, endpoint_url: "javascript:alert(1)" },
    { ...valid, endpoint_url: "https://user:pass@weather.test/mcp" },
    { ...valid, description: { html: "<b>" } },
    { ...valid, description: "d".repeat(2001) },
    { ...valid, pricing_model: "per_vibe" },
    { ...valid, pricing_model: 1 },
    { ...valid, tools: "weather.now" },
    { ...valid, tools: [null] },
    { ...valid, tools: ["weather.now"] },
    { ...valid, tools: [{ description: "no name" }] },
    { ...valid, tools: [{ tool_name: "   " }] },
    { ...valid, tools: [{ tool_name: "a" }, { tool_name: "a" }] },
    { ...valid, tools: Array.from({ length: 101 }, (_, i) => ({ tool_name: `t${i}` })) },
  ]) {
    const sb = fakeSupabase(okAnswers);
    const r = await loadRoute(sb)(body);
    assert.equal(r.status, 422, JSON.stringify(body).slice(0, 120));
    assert.equal(r.body.code, "VALIDATION_ERROR");
    assert.equal(sb.writes.length, 0);
  }
});

test("register-provider: a valid registration stores trimmed, typed fields and returns a key", async () => {
  const sb = fakeSupabase(okAnswers);
  const r = await loadRoute(sb)({
    ...valid,
    name: "  Weather Co  ",
    endpoint_url: " http://weather.test:8080/mcp ",
    pricing_model: "free",
    tools: [{ tool_name: " weather.now ", category: 7, input_schema: "nope" }],
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.api_key, "bz_test");
  assert.equal(r.body.tools_registered, 1);
  assert.equal(r.body.tools_failed, undefined);
  const provider = sb.writes.find((w) => w.table === "bazaar_providers").payload;
  assert.equal(provider.name, "Weather Co");
  assert.equal(provider.endpoint_url, "http://weather.test:8080/mcp");
  assert.equal(provider.pricing_model, "free");
  const tool = sb.writes.find((w) => w.table === "bazaar_tools").payload;
  assert.equal(tool.tool_name, "weather.now");
  assert.equal(tool.category, "other");
  assert.equal(tool.input_schema, null);
});

test("register-provider: a database error is not echoed to the caller", async () => {
  const sb = fakeSupabase({ "bazaar_providers.insert": () => ({ data: null, error: { message: "duplicate key value violates unique constraint \"bazaar_providers_email_key\"" } }) });
  const r = await loadRoute(sb)(valid);
  assert.equal(r.status, 500);
  assert.equal(r.body.message, "Provider could not be registered");
  assert.doesNotMatch(JSON.stringify(r.body), /constraint|bazaar_providers/);
});

test("register-provider: a failed API key insert is a 500 that removes the provider, never a 201 with a dead key", async () => {
  const sb = fakeSupabase({ ...okAnswers, "bazaar_api_keys.insert": () => ({ error: { message: "duplicate key" } }) });
  const r = await loadRoute(sb)({ ...valid, tools: [{ tool_name: "weather.now" }] });
  assert.equal(r.status, 500);
  assert.equal(r.body.api_key, undefined);
  const cleanup = sb.writes.find((w) => w.table === "bazaar_providers" && w.op === "delete");
  assert.deepEqual(cleanup.filters, [["id", PROVIDER]]);
  assert.equal(sb.writes.some((w) => w.table === "bazaar_tools"), false, "no tools under an unreachable provider");
});

test("register-provider: tools that fail to insert are reported instead of silently dropped", async () => {
  const sb = fakeSupabase({
    ...okAnswers,
    "bazaar_tools.insert": (rec) => rec.payload.tool_name === "bad.tool"
      ? { data: null, error: { message: "value too long" } }
      : { data: { id: "tool-1", ...rec.payload }, error: null },
  });
  const r = await loadRoute(sb)({ ...valid, tools: [{ tool_name: "good.tool" }, { tool_name: "bad.tool" }] });
  assert.equal(r.status, 201);
  assert.equal(r.body.tools_registered, 1);
  assert.deepEqual(r.body.tools_failed, ["bad.tool"]);
  assert.match(r.body.warning, /POST \/api\/bazaar\/tools/);
  assert.doesNotMatch(JSON.stringify(r.body), /value too long/);
});
