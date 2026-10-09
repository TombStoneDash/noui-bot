import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let ts: typeof import("../packages/noui-factory/node_modules/typescript");
try {
  ts = require("typescript");
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "MODULE_NOT_FOUND") throw error;
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}

const source = await readFile(new URL("../src/app/api/v1/bazaar/pricing/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

async function executeGET(tool: Record<string, unknown>) {
  const context = vm.createContext({
    exports: {},
    require(name: string) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return {
        getSupabase: () => ({
          from(table: string) {
            assert.equal(table, "bazaar_tools");
            return {
              select(columns: string) {
                assert.match(columns, /free_tier_calls/);
                return {
                  eq(column: string, value: unknown) {
                    assert.equal(column, "active");
                    assert.equal(value, true);
                    return {
                      order(column: string) {
                        assert.equal(column, "tool_name");
                        return Promise.resolve({ data: [tool], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        }),
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  const response = await context.exports.GET();
  return { response, body: await response.json() };
}

for (const [label, allowance, expected] of [
  ["zero", 0, 0],
  ["positive", 12, 12],
  ["null", null, 100],
  ["omitted", undefined, 100],
] as const) {
  test(`${label} free-tier allowance is displayed with stable pricing`, async () => {
    const tool: Record<string, unknown> = {
      id: "tool-1",
      tool_name: "example_tool",
      display_name: "Example Tool",
      description: "Example description",
      category: "utility",
      price_cents_override: 25,
      pricing_model_override: "per_call",
      bazaar_providers: {
        id: "provider-1",
        name: "Example Provider",
        pricing_model: "subscription",
        default_price_cents: 50,
      },
    };
    if (label !== "omitted") tool.free_tier_calls = allowance;

    const { response, body } = await executeGET(tool);
    assert.equal(response.status, 200);
    assert.equal(body.total, 1);
    assert.equal(body.pricing.length, 1);
    assert.deepEqual(body.pricing[0].pricing, {
      model: "per_call",
      price_per_call_microcents: 250_000,
      price_per_call_cents: 25,
      price_per_call: "$0.2500",
      free_tier_calls: expected,
    });
  });
}
