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
  new URL("../src/app/api/v1/bazaar/providers/[id]/trust/route.ts", import.meta.url),
  "utf8"
);
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const provider = {
  id: "provider-1",
  name: "Example Provider",
  verification_level: "unverified",
  verified_at: null,
};

async function executeGET({ usage, receipts = [], disputes = [0, 0], providerRecord = provider }) {
  const queries = [];
  let disputeQuery = 0;
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      }
      if (name === "@/lib/supabase") {
        return {
          getSupabase: () => ({
            from(table) {
              queries.push(table);
              if (table === "bazaar_providers") {
                return {
                  select(columns) {
                    assert.equal(columns, "id, name, verification_level, verified_at");
                    return {
                      eq(column, value) {
                        assert.equal(column, "id");
                        assert.equal(value, provider.id);
                        return { single: async () => ({ data: providerRecord, error: null }) };
                      },
                    };
                  },
                };
              }
              if (table === "bazaar_usage_logs") {
                return {
                  select(columns) {
                    assert.equal(columns, "status, latency_ms");
                    return {
                      eq(column, value) {
                        assert.equal(column, "provider_id");
                        assert.equal(value, provider.id);
                        return {
                          gte(column, value) {
                            assert.equal(column, "created_at");
                            assert.ok(!Number.isNaN(Date.parse(value)));
                            return Promise.resolve(usage);
                          },
                        };
                      },
                    };
                  },
                };
              }
              if (table === "bazaar_receipts") {
                return {
                  select(columns) {
                    assert.equal(columns, "receipt_id");
                    return {
                      eq(column, value) {
                        assert.equal(column, "provider_id");
                        assert.equal(value, provider.id);
                        return Promise.resolve({ data: receipts, error: null });
                      },
                    };
                  },
                };
              }
              if (table === "bazaar_disputes") {
                return {
                  select(columns, options) {
                    assert.equal(columns, "*");
                    assert.equal(options.count, "exact");
                    assert.equal(options.head, true);
                    return {
                      in(column, values) {
                        assert.equal(column, "receipt_id");
                        assert.deepEqual(values, receipts.map((receipt) => receipt.receipt_id));
                        const index = disputeQuery++;
                        if (index === 0) return Promise.resolve({ count: disputes[0], error: null });
                        assert.equal(index, 1);
                        return {
                          eq(column, value) {
                            assert.equal(column, "status");
                            assert.equal(value, "resolved_denied");
                            return Promise.resolve({ count: disputes[1], error: null });
                          },
                        };
                      },
                    };
                  },
                };
              }
              throw new Error(`Unexpected table: ${table}`);
            },
          }),
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  const response = await context.exports.GET(new Request("https://example.test/trust"), {
    params: Promise.resolve({ id: provider.id }),
  });
  return { response, body: await response.json(), queries };
}

test("resolved usage query error returns 503 before receipts or scoring", async () => {
  const databaseMessage = "private database connection details";
  const { response, body, queries } = await executeGET({
    usage: { data: null, error: { message: databaseMessage } },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(body, {
    error: true,
    code: "USAGE_UNAVAILABLE",
    message: "Trust score unavailable",
  });
  assert.equal(JSON.stringify(body).includes(databaseMessage), false);
  for (const field of ["trust_score", "badge", "components", "details", "scoring_guide"]) {
    assert.equal(Object.hasOwn(body, field), false);
  }
  assert.deepEqual(queries, ["bazaar_providers", "bazaar_usage_logs"]);
});

test("successful empty usage logs retain new-provider scoring", async () => {
  const { response, body, queries } = await executeGET({
    usage: { data: [], error: null },
  });

  assert.equal(response.status, 200);
  assert.equal(body.trust_score, 75);
  assert.equal(body.badge, "verified");
  assert.deepEqual(body.components, { verification: 0, uptime: 25, latency: 25, disputes: 25 });
  assert.equal(body.details.total_calls_30d, 0);
  assert.equal(body.details.success_rate, null);
  assert.equal(body.details.p95_latency_ms, null);
  assert.deepEqual(queries, ["bazaar_providers", "bazaar_usage_logs", "bazaar_receipts"]);
});

test("mixed usage logs retain uptime, latency, and dispute thresholds", async () => {
  const { response, body, queries } = await executeGET({
    providerRecord: { ...provider, verification_level: "code" },
    usage: {
      data: [
        { status: "success", latency_ms: 100 },
        { status: "success", latency_ms: 250 },
        { status: "failure", latency_ms: 700 },
        { status: "success", latency_ms: 1500 },
      ],
      error: null,
    },
    receipts: [{ receipt_id: "receipt-1" }],
    disputes: [1, 0],
  });

  assert.equal(response.status, 200);
  assert.equal(body.trust_score, 44);
  assert.equal(body.badge, "basic");
  assert.deepEqual(body.components, { verification: 25, uptime: 3, latency: 14, disputes: 2 });
  assert.equal(body.details.total_calls_30d, 4);
  assert.equal(body.details.success_rate, 75);
  assert.equal(body.details.p95_latency_ms, 1500);
  assert.equal(body.details.total_disputes, 1);
  assert.deepEqual(queries, [
    "bazaar_providers",
    "bazaar_usage_logs",
    "bazaar_receipts",
    "bazaar_disputes",
    "bazaar_disputes",
  ]);
});
