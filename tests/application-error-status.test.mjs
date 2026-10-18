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

const source = await readFile(new URL("../src/app/api/v1/apply/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function makeRoute({ insertError } = {}) {
  const inserts = [];
  const logs = [];
  const context = vm.createContext({
    exports: {},
    console: { error: (...args) => logs.push(args), log: (...args) => logs.push(args) },
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      }
      if (name === "@/lib/db") {
        return { sql: async (strings, ...values) => {
          inserts.push({ strings, values });
          if (insertError) throw insertError;
        } };
      }
      if (name === "@/lib/errors") {
        return { apiError: (code, message, details) => Response.json(
          { error: true, code, message, ...(details ? { details } : {}) },
          { status: code === "INTERNAL_ERROR" ? 500 : 400 }
        ) };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  return { post: context.exports.POST, inserts, logs };
}

function request(body) {
  return new Request("https://example.test/api/v1/apply", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("malformed JSON and invalid required fields return 400 without inserting", async () => {
  const { post, inserts } = makeRoute();
  for (const input of ["{bad", {}, null, { name: 4, contact: "synthetic@example.test" },
    { name: "Example", contact: {} }, { name: "  ", contact: "synthetic@example.test" }]) {
    const response = await post(request(input));
    assert.equal(response.status, 400);
  }
  assert.equal(inserts.length, 0);
});

test("valid application returns the existing 201 response", async () => {
  const { post, inserts } = makeRoute();
  const response = await post(request({ name: " Example ", contact: " synthetic@example.test " }));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(body).sort(), ["received", "id", "message", "context", "next_steps"].sort());
  assert.equal(body.received, true);
  assert.match(body.id, /^app_/);
  assert.equal(body.message, "Application received. We review every one personally.");
  assert.equal(typeof body.context, "string");
  assert.equal(typeof body.next_steps, "string");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].values[1], "Example");
  assert.equal(inserts[0].values[2], "synthetic@example.test");
});

test("insert rejection returns a generic 500 without exposing applicant or database details", async () => {
  const secret = "synthetic database connection detail";
  const { post, inserts, logs } = makeRoute({ insertError: new Error(secret) });
  const response = await post(request({ name: "Example", contact: "synthetic@example.test" }));
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.code, "INTERNAL_ERROR");
  assert.match(body.message, /try again later/i);
  assert.doesNotMatch(JSON.stringify(body), /synthetic@example\.test|synthetic database connection detail|invalid request/i);
  assert.equal(inserts.length, 1);
  assert.doesNotMatch(JSON.stringify(logs), /synthetic@example\.test|synthetic database connection detail/);
});
