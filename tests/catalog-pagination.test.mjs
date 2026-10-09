import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import * as catalogHygiene from "../src/lib/catalog-hygiene.ts";

const require = createRequire(import.meta.url);
// Support both a root install and the existing factory workspace install.
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));

const source = await readFile(new URL("../src/app/api/bazaar/catalog/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(result = { data: [], error: null }) {
  let databaseAccesses = 0;
  const calls = [];
  const query = {
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  for (const method of ["from", "select", "eq", "order", "range"]) {
    query[method] = (...args) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    URL,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return {
        getSupabase() { databaseAccesses++; return query; },
      };
      if (name === "@/lib/catalog-hygiene") return catalogHygiene;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: "catalog/route.js" });
  return { GET: exports.GET, calls, get databaseAccesses() { return databaseAccesses; } };
}

const request = (search = "") => new Request(`https://example.test/api/bazaar/catalog${search}`);

for (const [name, search, limit, offset] of [
  ["defaults", "", 50, 0],
  ["valid offset with default limit", "?offset=12", 50, 12],
  ["explicit zero offset", "?limit=3&offset=0", 3, 0],
  ["valid pagination", "?limit=10&offset=25", 10, 25],
  ["maximum limit", "?limit=100", 100, 0],
  ["limit clamp", "?limit=101&offset=2", 100, 2],
  ["largest safe limit is clamped", `?limit=${Number.MAX_SAFE_INTEGER}`, 100, 0],
  ["largest safe offset", `?limit=1&offset=${Number.MAX_SAFE_INTEGER}`, 1, Number.MAX_SAFE_INTEGER],
  ["range ending at safe boundary", `?limit=2&offset=${Number.MAX_SAFE_INTEGER - 1}`, 2, Number.MAX_SAFE_INTEGER - 1],
  ["boundary after clamp", `?limit=101&offset=${Number.MAX_SAFE_INTEGER - 99}`, 100, Number.MAX_SAFE_INTEGER - 99],
]) {
  test(name, async () => {
    const route = loadRoute();
    const response = await route.GET(request(search));
    assert.equal(response.status, 200);
    assert.equal(route.databaseAccesses, 1);
    assert.deepEqual(route.calls.filter(([method]) => method === "range"), []);
    assert.deepEqual(await response.json(), {
      tools: [], total: 0, providers: 0, limit, offset,
      categories: ["weather", "search", "code", "data", "comms", "other"],
    });
  });
}

for (const parameter of ["limit", "offset"]) {
  const invalid = ["-1", "-2", "1.5", "1.0", "abc", "12abc", "", " ", " 2", "2 ", "1e2", "0x10", "+2", "NaN", "Infinity", "9007199254740992", "9007199254740993", "9".repeat(400)];
  if (parameter === "limit") invalid.push("0");
  for (const value of invalid) {
    test(`rejects ${parameter}=${JSON.stringify(value)}`, async () => {
      const route = loadRoute();
      const response = await route.GET(request(`?${new URLSearchParams({ [parameter]: value })}`));
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.error, true);
      assert.match(body.message, new RegExp(`${parameter}.*safe integer`));
      assert.equal(route.databaseAccesses, 0);
      assert.deepEqual(route.calls, []);
    });
  }
}

for (const search of [
  "?limit=abc&offset=-2",
  `?limit=2&offset=${Number.MAX_SAFE_INTEGER}`,
  `?offset=${Number.MAX_SAFE_INTEGER}`,
  `?limit=101&offset=${Number.MAX_SAFE_INTEGER - 98}`,
]) {
  test(`rejects invalid pagination before database access: ${search}`, async () => {
    const route = loadRoute();
    const response = await route.GET(request(search));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, true);
    assert.match(body.message, /safe integer/);
    assert.equal(route.databaseAccesses, 0);
    assert.deepEqual(route.calls, []);
  });
}

test("preserves catalog output and category filtering", async () => {
  const route = loadRoute({ data: [{
    id: "tool-1", tool_name: "forecast", display_name: "Forecast", description: "Weather forecast",
    category: "weather", price_cents_override: 25, pricing_model_override: "per_call",
    free_tier_calls: 5, call_count: 12, avg_latency_ms: 30, uptime_pct: 99,
    bazaar_providers: { id: "provider-1", name: "Weather Co", verified: true, default_price_cents: 40 },
  }, {
    id: "tool-2", tool_name: "free", bazaar_providers: null,
  }, {
    id: "tool-3", tool_name: "provider-priced",
    bazaar_providers: { name: "Test Provider", default_price_cents: 10, pricing_model: "per_call" },
  }], error: null });
  const response = await route.GET(request("?category=weather&limit=3&offset=0"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 1);
  assert.equal(body.providers, 1);
  assert.deepEqual(body.tools, [{
    id: "tool-1", tool_name: "forecast", display_name: "Forecast", description: "Weather forecast",
    category: "weather", provider: { id: "provider-1", name: "Weather Co", verified: true },
    pricing: { model: "per_call", price_cents: 25, price: "$0.2500/call", free_tier_calls: 5 },
    stats: { total_calls: 12, avg_latency_ms: 30, uptime_pct: 99 },
  }]);
  assert.deepEqual(route.calls.filter(([method]) => method === "eq"), [["eq", "active", true], ["eq", "category", "weather"]]);
  assert.equal(route.calls.find(([method]) => method === "from")[1], "bazaar_tools");
});
