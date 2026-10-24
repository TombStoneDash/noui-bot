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

const SECRET = 'relation "bazaar_tools" does not exist at db.internal.example:5432';

/** A Supabase stand-in whose every query chain resolves (or throws) with `outcome`. */
function failingClient(outcome) {
  const chain = {
    then(resolve, reject) {
      if (outcome instanceof Error) return Promise.reject(outcome).then(resolve, reject);
      return Promise.resolve(outcome).then(resolve, reject);
    },
  };
  for (const method of ["from", "select", "eq", "gte", "order", "limit", "range"]) {
    chain[method] = () => chain;
  }
  return chain;
}

async function loadGET(path, outcome, method = "GET") {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: "route.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    URL,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => failingClient(outcome) };
      if (name === "@/lib/catalog-hygiene") return { filterCatalogRows: (rows) => rows, countRealProviders: () => 0 };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => ({ id: "provider-1", type: "provider" }) };
      if (name === "@/lib/stripe") return { getStripe: () => null, PLATFORM_FEE_RATE: 0.1 };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports[method];
}

const routes = [
  { path: "src/app/api/v1/bazaar/pricing/route.ts", message: "Pricing temporarily unavailable" },
  { path: "src/app/api/bazaar/catalog/route.ts", message: "Catalog temporarily unavailable" },
  {
    path: "src/app/api/bazaar/billing/stripe-summary/route.ts",
    method: "POST",
    message: "Billing summary temporarily unavailable",
  },
];

for (const { path, method = "GET", message } of routes) {
  test(`${path} does not echo a database error`, async () => {
    const handler = await loadGET(path, { data: null, count: null, error: { message: SECRET } }, method);
    const response = await handler(new Request("https://example.test/route", { method }));
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.deepEqual(body, { error: true, message });
    assert.equal(JSON.stringify(body).includes("bazaar_tools"), false);
  });
}

test("pricing does not echo a thrown error", async () => {
  const handler = await loadGET(routes[0].path, new Error(SECRET));
  const response = await handler();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: true, message: "Pricing temporarily unavailable" });
});
