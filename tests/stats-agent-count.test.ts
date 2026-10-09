import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));
const source = await readFile(new URL("../src/app/api/v1/bazaar/stats/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(consumerResult) {
  const queries = [];
  const fixtures = {
    total: { count: 10, data: null, error: null },
    successful: { count: 8, data: null, error: null },
    consumers: consumerResult,
    tools: { data: [{ id: "tool-1" }, { id: "tool-2" }], error: null },
    providers: { data: [{ id: "provider-1" }, { id: "provider-2" }, { id: "provider-3" }], error: null },
    revenue: { data: [{ cost_cents: 125 }, { cost_cents: 75 }], error: null },
    latency: { data: [{ latency_ms: 20 }, { latency_ms: 40 }], error: null },
    last: { data: [{ created_at: "2026-10-08T12:00:00.000Z" }], error: null },
  };
  const client = {
    from(table) {
      const query = { table };
      queries.push(query);
      const chain = {
        select(column, options) { query.column = column; query.options = options; return chain; },
        eq(column, value) { query.eq = [column, value]; return chain; },
        not(...args) { query.not = args; return chain; },
        limit(value) { query.limit = value; return chain; },
        order(column, options) { query.order = [column, options]; return chain; },
        then(resolve, reject) {
          let key;
          if (table === "bazaar_consumers") key = "consumers";
          else if (table === "bazaar_tools") key = "tools";
          else if (table === "bazaar_providers") key = "providers";
          else if (query.column === "cost_cents") key = "revenue";
          else if (query.column === "latency_ms") key = "latency";
          else if (query.column === "created_at") key = "last";
          else key = query.eq ? "successful" : "total";
          assert.ok(Object.hasOwn(fixtures, key), `Unexpected query: ${JSON.stringify(query)}`);
          return Promise.resolve(fixtures[key]).then(resolve, reject);
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
      providers: 3,
      total_revenue_microcents: 2_000_000,
      total_revenue_cents: 200,
      total_revenue: "$2.00",
      avg_response_time_ms: 30,
      free_tier_usage_pct: 0,
      last_invocation: "2026-10-08T12:00:00.000Z",
      timestamp: "2026-10-09T00:00:00.000Z",
    });
    assert.equal(queries[2].table, "bazaar_consumers");
    assert.equal(queries[2].column, "id");
    assert.equal(queries[2].options.count, "exact");
    assert.equal(queries[2].options.head, true);
    assert.equal(queries.length, 8);
  });
}

test("consumer query error returns an unavailable response without database details", async () => {
  const { GET, queries } = loadRoute({ data: null, count: null, error: { message: "private database details" } });
  const response = await GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: true, message: "Statistics temporarily unavailable" });
  assert.equal(queries.length, 3);
});
