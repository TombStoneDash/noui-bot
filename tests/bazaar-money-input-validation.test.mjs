import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import * as priceCents from "../src/lib/price-cents.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const CONSUMER = "11111111-1111-4111-8111-111111111111";
const PROVIDER = "22222222-2222-4222-8222-222222222222";

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

async function loadRoute(path, { sb, owner = null }) {
  const source = await readFile(new URL(`../src/app/api/bazaar/${path}/route.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, URL, Date, console,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/stripe") return { getStripe: () => null };
      if (name === "@/lib/price-cents") return priceCents;
      if (name === "@/lib/bazaar-auth") return {
        authenticateKey: async () => owner,
        generateBazaarKey: () => ({ key: "bz_test", hash: "hash", prefix: "bz_te" }),
      };
      if (name === "crypto") return require("node:crypto");
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: `${path}/route.js` });
  return async (body) => {
    const response = await exports.POST(new Request(`https://noui.bot/api/bazaar/${path}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  };
}

const consumer = { id: CONSUMER, type: "consumer", balance_cents: 1000 };
const provider = { id: PROVIDER, type: "provider" };

test("balance/load: a string amount is refused instead of concatenated onto the balance", async () => {
  const sb = fakeSupabase();
  const post = await loadRoute("balance/load", { sb, owner: consumer });
  for (const amount of ["500", 150.5, -500, 0, null, true]) {
    const r = await post({ amount_cents: amount });
    assert.equal(r.status, 422, `amount ${JSON.stringify(amount)}`);
    assert.equal(r.body.code, "VALIDATION_ERROR");
  }
  assert.equal(sb.writes.length, 0);
});

test("balance/load: an integer amount still loads in dry-run mode", async () => {
  const sb = fakeSupabase();
  const post = await loadRoute("balance/load", { sb, owner: consumer });
  const r = await post({ amount_cents: 500 });
  assert.equal(r.status, 200);
  assert.equal(r.body.new_balance_cents, 1500);
  assert.equal(sb.writes.find((w) => w.table === "bazaar_consumers").payload.balance_cents, 1500);
});

test("balance/load: a failed balance update is a 500, not a reported top-up", async () => {
  const sb = fakeSupabase({ "bazaar_consumers.update": () => ({ error: { message: "connection reset" } }) });
  const post = await loadRoute("balance/load", { sb, owner: consumer });
  const r = await post({ amount_cents: 500 });
  assert.equal(r.status, 500);
  assert.equal(r.body.message, "Balance could not be updated");
});

const consumerAnswers = { "bazaar_consumers.insert": (rec) => ({ data: { id: CONSUMER, ...rec.payload }, error: null }) };

test("register-consumer: a self-chosen limit above the free plan is refused", async () => {
  for (const rpm of [1_000_000, 300, 61, 0, -1, 30.5, "60"]) {
    const sb = fakeSupabase(consumerAnswers);
    const post = await loadRoute("register-consumer", { sb });
    const r = await post({ name: "Agent", email: "a@example.test", rate_limit_rpm: rpm });
    assert.equal(r.status, 422, `rpm ${JSON.stringify(rpm)}`);
    assert.equal(sb.writes.length, 0);
  }
});

test("register-consumer: default and lower limits are stored", async () => {
  for (const [rpm, stored] of [[undefined, 60], [10, 10], [60, 60]]) {
    const sb = fakeSupabase(consumerAnswers);
    const post = await loadRoute("register-consumer", { sb });
    const r = await post({ name: "Agent", email: "a@example.test", rate_limit_rpm: rpm });
    assert.equal(r.status, 201);
    assert.equal(sb.writes[0].payload.rate_limit_rpm, stored);
  }
});

test("register-consumer: a failed API key insert is a 500, never a 201 with a dead key", async () => {
  const sb = fakeSupabase({ ...consumerAnswers, "bazaar_api_keys.insert": () => ({ error: { message: "duplicate key" } }) });
  const post = await loadRoute("register-consumer", { sb });
  const r = await post({ name: "Agent", email: "a@example.test" });
  assert.equal(r.status, 500);
  assert.equal(r.body.api_key, undefined);
});

const providerAnswers = {
  "bazaar_providers.insert": (rec) => ({ data: { id: PROVIDER, ...rec.payload }, error: null }),
  "bazaar_tools.insert": (rec) => ({ data: { id: "tool-1", ...rec.payload }, error: null }),
};
const providerBody = { name: "Weather Co", email: "p@example.test", endpoint_url: "https://weather.test/mcp" };

test("register-provider: price_cents_override 0 stays 0 (free), not null (provider default)", async () => {
  const sb = fakeSupabase(providerAnswers);
  const post = await loadRoute("register-provider", { sb });
  const r = await post({ ...providerBody, default_price_cents: 5, tools: [{ tool_name: "free.tool", price_cents_override: 0 }, { tool_name: "default.tool" }] });
  assert.equal(r.status, 201);
  const tools = sb.writes.filter((w) => w.table === "bazaar_tools");
  assert.equal(tools[0].payload.price_cents_override, 0);
  assert.equal(tools[1].payload.price_cents_override, null);
});

test("register-provider: negative or fractional prices are refused before anything is created", async () => {
  for (const body of [
    { ...providerBody, default_price_cents: -5 },
    { ...providerBody, default_price_cents: 2.5 },
    { ...providerBody, default_price_cents: "5" },
    { ...providerBody, tools: [{ tool_name: "t", price_cents_override: -1 }] },
    { ...providerBody, tools: [{ tool_name: "t", price_cents_override: 0.5 }] },
  ]) {
    const sb = fakeSupabase(providerAnswers);
    const post = await loadRoute("register-provider", { sb });
    const r = await post(body);
    assert.equal(r.status, 422, JSON.stringify(body));
    assert.equal(sb.writes.length, 0);
  }
});

test("tools: updating an existing tool with a negative price is refused", async () => {
  const sb = fakeSupabase({ "bazaar_tools.select": () => ({ data: { id: "tool-1" }, error: null }) });
  const post = await loadRoute("tools", { sb, owner: provider });
  const r = await post({ tools: [{ tool_name: "weather.now", price_cents_override: -500 }] });
  assert.equal(sb.writes.length, 0, "no update with a negative price");
  assert.match(JSON.stringify(r.body), /non-negative integer/);
});

test("tools: a fractional price on a new tool is refused", async () => {
  const sb = fakeSupabase();
  const post = await loadRoute("tools", { sb, owner: provider });
  const r = await post({ tools: [{ tool_name: "weather.now", price_cents_override: 1.5 }] });
  assert.equal(sb.writes.length, 0);
  assert.match(JSON.stringify(r.body), /non-negative integer/);
});

test("tools: updating an existing tool to free (0) is still allowed", async () => {
  const sb = fakeSupabase({
    "bazaar_tools.select": () => ({ data: { id: "tool-1" }, error: null }),
    "bazaar_tools.update": (rec) => ({ data: { id: "tool-1", tool_name: "weather.now", ...rec.payload }, error: null }),
  });
  const post = await loadRoute("tools", { sb, owner: provider });
  await post({ tools: [{ tool_name: "weather.now", price_cents_override: 0 }] });
  assert.equal(sb.writes[0].payload.price_cents_override, 0);
});
