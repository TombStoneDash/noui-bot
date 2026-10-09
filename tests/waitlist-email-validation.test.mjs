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

const source = await readFile(new URL("../src/app/api/v1/waitlist/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(rows = [{ id: 17 }], storageError) {
  const inserts = [];
  const context = vm.createContext({
    exports: {},
    console: { log() {}, error() {} },
    require(name) {
      if (name === "next/server") return {
        NextResponse: { json: (body, { status = 200 } = {}) => ({ body, status }) },
      };
      if (name === "@/lib/db") return {
        sql: async (strings, ...values) => {
          inserts.push({ query: strings.join("?"), values });
          if (storageError) throw storageError;
          return rows;
        },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  return { POST: context.exports.POST, inserts };
}

async function submit(route, body) {
  return route.POST({ json: async () => body });
}

for (const body of [null, [], {}, { email: null }, { email: 42 }, { email: false },
  { email: { includes: () => true } }, { email: ["a@example.com"] }]) {
  test(`malformed email type ${JSON.stringify(body)} returns 400 without storage`, async () => {
    const route = loadRoute();
    const response = await submit(route, body);
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Valid email required.");
    assert.equal(route.inserts.length, 0);
  });
}

for (const email of ["", "   ", "@", "a@", "@example.com", "a@example", "a..b@example.com",
  ".a@example.com", "a.@example.com", "a@.example.com", "a@example..com",
  "a@-example.com", "a@example.c-m", "a b@example.com", "a@example.com extra"]) {
  test(`invalid address ${JSON.stringify(email)} returns 400 without storage`, async () => {
    const route = loadRoute();
    const response = await submit(route, { email });
    assert.equal(response.status, 400);
    assert.equal(route.inserts.length, 0);
  });
}

test("invalid JSON returns 400 without storage", async () => {
  const route = loadRoute();
  const response = await route.POST({ json: async () => JSON.parse("{") });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Invalid JSON body.");
  assert.equal(route.inserts.length, 0);
});

test("email is trimmed and lowercased once; source defaults to api", async () => {
  const route = loadRoute();
  const response = await submit(route, { email: "  Alice.Smith+News@Example.COM  " });
  assert.equal(response.status, 201);
  assert.equal(response.body.email, "alice.smith+news@example.com");
  assert.equal(response.body.id, 17);
  assert.equal(route.inserts.length, 1);
  assert.equal(route.inserts[0].values[0], "alice.smith+news@example.com");
  assert.equal(route.inserts[0].values[1], "api");
});

test("explicit source is retained and duplicate signup returns 200", async () => {
  const route = loadRoute([]);
  const response = await submit(route, { email: "  USER@Example.com ", source: "landing" });
  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Already on the list.");
  assert.equal(response.body.email, "user@example.com");
  assert.equal(route.inserts.length, 1);
  assert.equal(route.inserts[0].values[1], "landing");
});

test("storage failure returns 500 after one insert attempt", async () => {
  const route = loadRoute([], new Error("database unavailable"));
  const response = await submit(route, { email: "user@example.com" });
  assert.equal(response.status, 500);
  assert.equal(response.body.error, "Internal error.");
  assert.equal(route.inserts.length, 1);
});
