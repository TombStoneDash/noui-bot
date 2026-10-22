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

const parse = (qs) => parsePagination(new URLSearchParams(qs), { defaultLimit: 50, maxLimit: 100 });

test("parsePagination: defaults, clamping and valid values", () => {
  assert.deepEqual(parse(""), { limit: 50, offset: 0 });
  assert.deepEqual(parse("limit=10&offset=20"), { limit: 10, offset: 20 });
  assert.deepEqual(parse("limit=500"), { limit: 100, offset: 0 });
});

for (const qs of ["limit=abc", "limit=0", "limit=-5", "limit=10abc", "limit=1.5", "limit=", "offset=-1", "offset=x", "offset=9007199254740992"]) {
  test(`parsePagination rejects ${qs}`, () => {
    assert.ok("error" in parse(qs));
  });
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
  disputes: await loadRoute("../src/app/api/v1/bazaar/disputes/route.ts"),
  usage: await loadRoute("../src/app/api/bazaar/usage/route.ts"),
  summary: await loadRoute("../src/app/api/bazaar/usage/summary/route.ts"),
};

// Records every builder call; resolves to an empty list.
function recordingClient() {
  const calls = [];
  const builder = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") {
          return (onFulfilled) => Promise.resolve({ data: [], count: 0, error: null }).then(onFulfilled);
        }
        return (...args) => {
          calls.push([prop, ...args]);
          return builder;
        };
      },
    }
  );
  return { calls, from: (table) => { calls.push(["from", table]); return builder; } };
}

async function get(route, qs) {
  const sb = recordingClient();
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      }
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") {
        return { authenticateKey: async () => ({ id: "consumer-1", type: "consumer", name: "c" }) };
      }
      if (name === "@/lib/pagination") return { parsePagination };
      if (name === "@/lib/receipts") return { generateDisputeId: () => "dsp_test" };
      throw new Error(`Unexpected import: ${name}`);
    },
    Response,
    Date,
    URL,
  });
  vm.runInContext(routes[route], context);
  const response = await context.exports.GET(new Request(`https://noui.bot/api/x?${qs}`));
  return { status: response.status, json: await response.json(), calls: sb.calls };
}

for (const route of ["receipts", "disputes"]) {
  test(`${route}: valid page reaches the database as an integer range`, async () => {
    const out = await get(route, "limit=10&offset=20");
    assert.equal(out.status, 200);
    assert.deepEqual(out.calls.find((c) => c[0] === "range"), ["range", 20, 29]);
    assert.equal(out.json.limit, 10);
    assert.equal(out.json.offset, 20);
  });

  for (const qs of ["limit=abc", "limit=-5", "offset=-1"]) {
    test(`${route}: ${qs} is a 400 and never queries`, async () => {
      const out = await get(route, qs);
      assert.equal(out.status, 400);
      assert.equal(out.json.code, "BAD_REQUEST");
      assert.equal(out.calls.length, 0);
    });
  }
}

test("usage: limit=abc is a 400 instead of .limit(NaN)", async () => {
  const out = await get("usage", "limit=abc");
  assert.equal(out.status, 400);
  assert.equal(out.calls.length, 0);
});

test("usage: 90d is honoured, matching /usage/summary", async () => {
  const before = Date.now();
  const out = await get("usage", "period=90d");
  assert.equal(out.status, 200);
  assert.equal(out.json.period, "90d");
  const since = Date.parse(out.calls.find((c) => c[0] === "gte")[2]);
  const days = (before - since) / 86_400_000;
  assert.ok(days > 89.9 && days < 90.1, `expected ~90 days, got ${days}`);
});

for (const route of ["usage", "summary"]) {
  test(`${route}: unknown period is a 400, not mislabelled 30d data`, async () => {
    const out = await get(route, "period=1y");
    assert.equal(out.status, 400);
    assert.equal(out.calls.length, 0);
  });
}
