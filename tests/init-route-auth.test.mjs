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
const source = await readFile(new URL("../src/app/api/v1/init/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute({ secret, initDB = async () => {} }) {
  const calls = { init: 0 };
  const context = vm.createContext({
    exports: {},
    process: { env: secret === undefined ? {} : { INIT_SECRET: secret } },
    console: { error() {} },
    require(name) {
      if (name === "node:crypto") return require("node:crypto");
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/db") {
        return {
          initDB: async () => {
            calls.init += 1;
            return initDB();
          },
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  const post = (authorization) =>
    context.exports.POST(
      new Request("https://noui.bot/api/v1/init", {
        method: "POST",
        headers: authorization ? { authorization } : {},
      })
    );
  return { post, calls };
}

test("init is disabled when INIT_SECRET is not configured", async () => {
  const { post, calls } = loadRoute({ secret: undefined });
  const response = await post("Bearer anything");
  assert.equal(response.status, 503);
  assert.equal(calls.init, 0);
});

test("init rejects missing or wrong credentials without touching the database", async () => {
  const { post, calls } = loadRoute({ secret: "s3cret-value" });
  for (const header of [undefined, "s3cret-value", "Bearer wrong", "Bearer s3cret-valu", "Basic s3cret-value"]) {
    const response = await post(header);
    assert.equal(response.status, 401, String(header));
  }
  assert.equal(calls.init, 0);
});

test("init runs with the operator secret", async () => {
  const { post, calls } = loadRoute({ secret: "s3cret-value" });
  const response = await post("Bearer s3cret-value");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).initialized, true);
  assert.equal(calls.init, 1);
});

test("init failure does not echo database error details", async () => {
  const { post } = loadRoute({
    secret: "s3cret-value",
    initDB: async () => {
      throw new Error("password authentication failed for user neondb_owner at ep-x.neon.tech");
    },
  });
  const response = await post("Bearer s3cret-value");
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.deepEqual(body, { error: "Database initialization failed." });
});
