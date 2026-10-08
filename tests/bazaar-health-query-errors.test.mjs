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
const source = await readFile(new URL("../src/app/api/bazaar/health/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

async function executeGET(provider, tool) {
  const startedAt = Date.parse("2026-01-01T00:00:00.000Z");
  let now = startedAt;
  const fixtures = { bazaar_providers: provider, bazaar_tools: tool };
  const queries = [];
  const context = vm.createContext({
    exports: {},
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return {
        getSupabase: () => ({
          from(table) {
            assert.ok(Object.hasOwn(fixtures, table));
            return {
              select(column, options) {
                assert.equal(column, "id");
                assert.equal(options.count, "exact");
                assert.equal(options.head, true);
                return {
                  eq(column, value) {
                    assert.equal(column, "active");
                    assert.equal(value, true);
                    queries.push(table);
                    const fixture = fixtures[table];
                    return typeof fixture === "function" ? fixture() : Promise.resolve(fixture);
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
  now += 12_345;
  const response = await context.exports.GET();
  const body = await response.json();
  assert.equal(body.uptime_seconds, 12);
  assert.equal(body.timestamp, "2026-01-01T00:00:12.345Z");
  return { response, body, queries };
}

const success = (count) => ({ count, error: null });
const failure = { count: null, error: { message: "fixture" } };

for (const [name, provider, tool] of [
  ["provider query failure", failure, success(7)],
  ["tool query failure", success(3), failure],
  ["both query failures", failure, failure],
  ["provider query throws", () => { throw new Error("fixture"); }, success(7)],
  ["tool query throws", success(3), () => { throw new Error("fixture"); }],
  ["provider query rejects", () => Promise.reject(new Error("fixture")), success(7)],
  ["tool query rejects", success(3), () => Promise.reject(new Error("fixture"))],
]) {
  test(`${name} returns degraded HTTP 503 with null counts`, async () => {
    const { response, body, queries } = await executeGET(provider, tool);
    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      status: "degraded",
      provider_count: null,
      tool_count: null,
      uptime_seconds: 12,
      timestamp: "2026-01-01T00:00:12.345Z",
    });
    if (typeof provider !== "function" && typeof tool !== "function") {
      assert.deepEqual(queries, ["bazaar_providers", "bazaar_tools"]);
    }
  });
}

for (const [provider, tool] of [[3, 7], [0, 0], [0, 7], [3, 0]]) {
  test(`successful counts ${provider}/${tool} return healthy HTTP 200`, async () => {
    const { response, body, queries } = await executeGET(success(provider), success(tool));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(body, {
      status: "ok",
      provider_count: provider,
      tool_count: tool,
      uptime_seconds: 12,
      timestamp: "2026-01-01T00:00:12.345Z",
    });
    assert.deepEqual(queries, ["bazaar_providers", "bazaar_tools"]);
  });
}
