import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import * as catalogHygiene from "../src/lib/catalog-hygiene.ts";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));
const source = await readFile(new URL("../src/app/api/v1/bazaar/stats/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(consumerResult, overrides = {}) {
  const queries = [];
  const fixtures = {
    total: { count: 10, data: null, error: null },
    successful: { count: 8, data: null, error: null },
    free: { count: 2, data: null, error: null },
    consumers: consumerResult,
    tools: { data: [{ id: "tool-1", bazaar_providers: { id: "provider-1", name: "Weather Co" } }, { id: "tool-2", bazaar_providers: { id: "provider-2", name: "Data Co" } }], error: null },
    providers: { data: [{ id: "provider-1" }, { id: "provider-2" }, { id: "provider-3" }], error: null },
    revenue: { data: [{ cost_cents: 125 }, { cost_cents: 75 }], error: null },
    latency: { data: [{ latency_ms: 20 }, { latency_ms: 40 }], error: null },
    last: { data: [{ created_at: "2026-10-08T12:00:00.000Z" }], error: null },
    ...overrides,
  };
  const client = {
    from(table) {
      const query = { table };
      queries.push(query);
      const chain = {
        select(column, options) { query.column = column; query.options = options; return chain; },
        eq(column, value) { query.eq = [column, value]; return chain; },
        not(...args) { query.not = args; return chain; },
        or(filter) { query.or = filter; return chain; },
        gt(column, value) { query.gt = [column, value]; return chain; },
        range(from, to) { query.range = [from, to]; return chain; },
        limit(value) { query.limit = value; return chain; },
        order(column, options) { query.order = [column, options]; return chain; },
        then(resolve, reject) {
          let key;
          if (table === "bazaar_consumers") key = "consumers";
          else if (table === "bazaar_tools") key = "tools";
          else if (table === "bazaar_providers") key = "providers";
          else if (query.column === "cost_cents") key = "revenue";
          else if (query.or) key = "free";
          else if (query.column === "latency_ms") key = "latency";
          else if (query.column === "created_at") key = "last";
          else key = query.eq ? "successful" : "total";
          assert.ok(Object.hasOwn(fixtures, key), `Unexpected query: ${JSON.stringify(query)}`);
          const fixture = typeof fixtures[key] === "function" ? fixtures[key](query) : fixtures[key];
          return Promise.resolve(fixture).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : ["2026-10-09T00:00:00.000Z"])); }
    },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => client };
      if (name === "@/lib/catalog-hygiene") return catalogHygiene;
      throw new Error(`Unexpected import: ${name}`);
    },
  }, { filename: "stats/route.js" });
  return { GET: exports.GET, queries };
}

for (const count of [7, 0]) {
  test(`head-only consumer count ${count} appears in successful statistics`, async () => {
    const { GET, queries } = loadRoute({ data: null, count, error: null });
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "public, s-maxage=60, stale-while-revalidate=120");
    assert.deepEqual(await response.json(), {
      total_tool_invocations: 10,
      successful_calls: 8,
      unique_agents: count,
      unique_tools: 2,
      tools_listed: 2,
      providers: 2,
      total_revenue_microcents: 2_000_000,
      total_revenue_cents: 200,
      total_revenue: "$2.00",
      avg_response_time_ms: 30,
      free_tier_usage_pct: 25,
      last_invocation: "2026-10-08T12:00:00.000Z",
      timestamp: "2026-10-09T00:00:00.000Z",
    });
    assert.equal(queries[3].table, "bazaar_consumers");
    assert.equal(queries[3].column, "id");
    assert.equal(queries[3].options.count, "exact");
    assert.equal(queries[3].options.head, true);
    assert.equal(queries.length, 8);
  });
}

test("consumer query error returns an unavailable response without database details", async () => {
  const { GET, queries } = loadRoute({ data: null, count: null, error: { message: "private database details" } });
  const response = await GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: true, message: "Statistics temporarily unavailable" });
  assert.equal(queries.length, 4);
});

const okConsumers = { data: null, count: 3, error: null };

test("revenue pages past the 1000-row response cap instead of undercounting", async () => {
  const pages = [1000, 1000, 1];
  const { GET, queries } = loadRoute(okConsumers, {
    revenue: (query) => {
      const [from, to] = query.range;
      assert.equal(to - from, 999);
      const size = pages[from / 1000];
      return { data: Array.from({ length: size }, () => ({ cost_cents: 2 })), error: null };
    },
  });
  const response = await GET();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total_revenue_cents, 4002);
  assert.equal(body.total_revenue, "$40.02");
  const revenueQueries = queries.filter((query) => query.column === "cost_cents");
  assert.deepEqual(revenueQueries.map((query) => query.range), [[0, 999], [1000, 1999], [2000, 2999]]);
  for (const query of revenueQueries) {
    assert.deepEqual(query.eq, ["status", "success"]);
    assert.deepEqual(query.gt, ["cost_cents", 0]);
  }
});

for (const [free, successful, pct] of [[0, 8, 0], [8, 8, 100], [3, 4, 75], [0, 0, 100]]) {
  test(`free tier share is ${pct}% for ${free} free of ${successful} successful calls`, async () => {
    const { GET, queries } = loadRoute(okConsumers, {
      free: { count: free, data: null, error: null },
      successful: { count: successful, data: null, error: null },
    });
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).free_tier_usage_pct, pct);
    const freeQuery = queries.find((query) => query.or);
    assert.deepEqual(freeQuery.eq, ["status", "success"]);
    assert.equal(freeQuery.or, "cost_cents.eq.0,cost_cents.is.null");
  });
}

for (const source of ["total", "successful", "free", "tools", "revenue", "latency", "last"]) {
  test(`${source} query error returns an unavailable response, never zeros`, async () => {
    const { GET } = loadRoute(okConsumers, {
      [source]: { data: null, count: null, error: { message: "private database details" } },
    });
    const response = await GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: true, message: "Statistics temporarily unavailable" });
  });
}

test("a thrown error is reported without its message", async () => {
  const { GET } = loadRoute(okConsumers, {
    latency: () => { throw new Error("private database details"); },
  });
  const response = await GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: true, message: "Statistics temporarily unavailable" });
});
