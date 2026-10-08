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

const source = await readFile(
  new URL("../src/app/api/v1/bazaar/providers/[id]/sla/route.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const now = Date.parse("2026-01-01T00:00:00.000Z");
const periodStart = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

async function executeGET(logs) {
  const queries = [];
  const supabase = {
    from(table) {
      const query = { table, columns: null, filters: [] };
      const chain = {
        select(columns, options) {
          query.columns = columns;
          query.options = options;
          return this;
        },
        eq(column, value) {
          query.filters.push(["eq", column, value]);
          return this;
        },
        gte(column, value) {
          query.filters.push(["gte", column, value]);
          return this;
        },
        in(column, value) {
          query.filters.push(["in", column, Array.from(value)]);
          return this;
        },
        single() {
          return Promise.resolve(result());
        },
        then(resolve, reject) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      function result() {
        queries.push(query);
        if (table === "bazaar_providers") {
          return { data: {
            id: "provider-1",
            name: "Test provider",
            verification_level: "verified",
            verified_at: null,
          }, error: null };
        }
        if (table === "bazaar_usage_logs") return { data: logs, error: null };
        if (table === "bazaar_receipts" && query.columns === "*") return { count: 2 };
        if (table === "bazaar_receipts") {
          return { data: [{ receipt_id: "receipt-1" }, { receipt_id: "receipt-2" }] };
        }
        if (table === "bazaar_disputes") return { count: 1 };
        throw new Error(`Unexpected table: ${table}`);
      }
      return chain;
    },
  };
  const context = vm.createContext({
    exports: {},
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    },
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      }
      if (name === "@/lib/supabase") return { getSupabase: () => supabase };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);

  const response = await context.exports.GET(undefined, {
    params: Promise.resolve({ id: "provider-1" }),
  });
  return { response, body: await response.json(), queries };
}

function shuffledRange(size) {
  return [
    ...Array.from({ length: size / 2 }, (_, index) => size - index * 2),
    ...Array.from({ length: size / 2 }, (_, index) => index * 2 + 1),
  ];
}

const twenty = shuffledRange(20);
const cases = [
  { name: "twenty unordered samples at the rank boundary", values: twenty, p95: 19, average: 11 },
  { name: "hundred unordered samples at the rank boundary", values: shuffledRange(100), p95: 95, average: 51 },
  { name: "one sample", values: [7], p95: 7, average: 7 },
  { name: "repeated values", values: [7, 4, 7, 4, 4], p95: 7, average: 5 },
  { name: "no samples", values: [], p95: 0, average: 0 },
  {
    name: "null and nonpositive latencies excluded",
    values: [null, 0, -3, ...twenty],
    p95: 19,
    average: 11,
    excluded: 3,
  },
];

for (const { name, values, p95, average, excluded = 0 } of cases) {
  test(`GET reports nearest-rank p95 for ${name}`, async () => {
    const logs = values.map((latency_ms, index) => ({
      latency_ms,
      status: index < excluded ? "error" : "success",
      created_at: "2025-12-31T00:00:00.000Z",
    }));
    const { response, body, queries } = await executeGET(logs);
    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      provider_id: "provider-1",
      provider_name: "Test provider",
      period: "30d",
      period_start: periodStart,
      period_end: "2026-01-01T00:00:00.000Z",
      uptime_30d: values.length ? Number((((values.length - excluded) / values.length) * 100).toFixed(2)) : 100,
      avg_latency_ms: average,
      p95_latency_ms: p95,
      error_rate_30d: values.length ? Number((excluded / values.length).toFixed(4)) : 0,
      total_calls_30d: values.length,
      successful_calls_30d: values.length - excluded,
      error_calls_30d: excluded,
      receipts_issued: 2,
      disputes: 1,
      verification_level: "verified",
      verified_at: null,
    });
    assert.deepEqual(queries.map(({ table, columns, filters }) => ({ table, columns, filters })), [
      { table: "bazaar_providers", columns: "id, name, verification_level, verified_at", filters: [["eq", "id", "provider-1"]] },
      { table: "bazaar_usage_logs", columns: "status, latency_ms, created_at", filters: [["eq", "provider_id", "provider-1"], ["gte", "created_at", periodStart]] },
      { table: "bazaar_receipts", columns: "*", filters: [["eq", "provider_id", "provider-1"], ["gte", "created_at", periodStart]] },
      { table: "bazaar_receipts", columns: "receipt_id", filters: [["eq", "provider_id", "provider-1"]] },
      { table: "bazaar_disputes", columns: "*", filters: [["in", "receipt_id", ["receipt-1", "receipt-2"]]] },
    ]);
  });
}
