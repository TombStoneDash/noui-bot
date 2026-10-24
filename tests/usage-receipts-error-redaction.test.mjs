import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

import { parsePagination } from "../src/lib/pagination.ts";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}

async function loadRoute(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    fileName: "route.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const routes = {
  receipts: await loadRoute("../src/app/api/v1/bazaar/receipts/route.ts"),
  usage: await loadRoute("../src/app/api/bazaar/usage/route.ts"),
  summary: await loadRoute("../src/app/api/bazaar/usage/summary/route.ts"),
};

const SECRET = 'permission denied for relation "bazaar_usage_logs" on host db-internal-7';

// Every query builder call chains; awaiting resolves to `result`.
function client(result) {
  const builder = new Proxy({}, {
    get(_, prop) {
      if (prop === "then") return (onFulfilled) => Promise.resolve(result).then(onFulfilled);
      return () => builder;
    },
  });
  return { from: () => builder };
}

async function get(route, qs, result) {
  const logs = [];
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => client(result) };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => ({ id: "consumer-1", type: "consumer", name: "c" }) };
      if (name === "@/lib/pagination") return { parsePagination };
      throw new Error(`Unexpected import: ${name}`);
    },
    console: { error: (...args) => logs.push(args.join(" ")) },
    Response,
    Date,
    URL,
    Map,
  });
  vm.runInContext(routes[route], context);
  const response = await context.exports.GET(new Request(`https://noui.bot/api/x?${qs}`));
  return { status: response.status, json: await response.json(), logs };
}

for (const route of Object.keys(routes)) {
  test(`${route}: a database error is logged, not returned`, async () => {
    const out = await get(route, "", { data: null, count: null, error: { message: SECRET } });
    assert.equal(out.status, 500);
    assert.equal(out.json.code, "SERVICE_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(out.json), /db-internal-7|permission denied/);
    assert.match(out.logs.join("\n"), /db-internal-7/);
  });
}

const row = (i) => ({ id: `u${i}`, status: "success", cost_cents: 1, latency_ms: 10, created_at: "2026-10-20T00:00:00Z", tool_id: "t1" });

test("usage: summary says it covers only the returned page", async () => {
  const full = await get("usage", "limit=3", { data: [row(1), row(2), row(3)], error: null });
  assert.equal(full.status, 200);
  assert.equal(full.json.summary.calls_included, 3);
  assert.equal(full.json.summary.truncated, true);
  const partial = await get("usage", "limit=3", { data: [row(1)], error: null });
  assert.equal(partial.json.summary.truncated, false);
});

test("usage/summary: flags when the 10k aggregation cap was reached", async () => {
  const small = await get("summary", "", { data: [row(1)], error: null });
  assert.equal(small.status, 200);
  assert.equal(small.json.summary.truncated, false);
  const capped = await get("summary", "", { data: Array.from({ length: 10000 }, (_, i) => row(i)), error: null });
  assert.equal(capped.json.summary.truncated, true);
  assert.equal(capped.json.summary.total_calls, 10000);
});
