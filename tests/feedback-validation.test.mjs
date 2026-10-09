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

const source = await readFile(new URL("../src/app/api/v1/feedback/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute(sql) {
  const context = vm.createContext({
    exports: {},
    Request,
    console: { log() {}, error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "@/lib/db") return { sql };
      if (name === "@/lib/errors") return {
        apiError(code, message, details) {
          const status = { BAD_REQUEST: 400, VALIDATION_ERROR: 422, INTERNAL_ERROR: 500 }[code];
          return Response.json({ error: true, code, message, ...(details && { details }) }, { status });
        },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  return context.exports.POST;
}

async function submit(payload, sql = async () => {}, raw = false) {
  const post = loadRoute(sql);
  const body = raw ? payload : JSON.stringify(payload);
  const response = await post(new Request("https://example.test/api/v1/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  }));
  return { response, data: await response.json() };
}

test("malformed JSON receives a client error without a database call", async () => {
  const { response, data } = await submit("{broken", () => { throw new Error("unexpected insert"); }, true);
  assert.equal(response.status, 400);
  assert.equal(data.code, "BAD_REQUEST");
});

for (const payload of [null, [], 42, "feedback", { message: 42 }, { message: null },
  { walls: "blocked" }, { walls: ["blocked", 42] }, { walls: null },
  { needs: {} }, { needs: [null] }, { needs: ["needed"], message: false }]) {
  test(`invalid feedback ${JSON.stringify(payload)} receives a validation error`, async () => {
    let writes = 0;
    const { response, data } = await submit(payload, () => { writes++; });
    assert.equal(response.status, 422);
    assert.equal(data.code, "VALIDATION_ERROR");
    assert.equal(writes, 0);
  });
}

for (const payload of [{}, { walls: [], needs: [], message: "  " },
  { walls: ["  "] }, { needs: [""] }]) {
  test(`empty feedback ${JSON.stringify(payload)} is rejected`, async () => {
    let writes = 0;
    const { response, data } = await submit(payload, () => { writes++; });
    assert.equal(response.status, 422);
    assert.equal(data.code, "VALIDATION_ERROR");
    assert.match(data.message, /Submit at least one/);
    assert.equal(writes, 0);
  });
}

for (const payload of [{ message: "Useful feedback" }, { walls: ["blocked.example"] },
  { needs: ["an API"] }, { walls: [], needs: ["an API"], message: "  " }]) {
  test(`valid feedback ${JSON.stringify(payload)} is persisted`, async () => {
    const inserts = [];
    const { response, data } = await submit(payload, async (_strings, ...values) => { inserts.push(values); });
    assert.equal(response.status, 201);
    assert.equal(data.received, true);
    assert.match(data.id, /^fb_/);
    assert.equal(inserts.length, 1);
    assert.deepEqual(Array.from(inserts[0][4]), payload.walls ?? []);
    assert.deepEqual(Array.from(inserts[0][5]), payload.needs ?? []);
    assert.equal(inserts[0][6], payload.message || null);
  });
}

test("database rejection returns a server error without database details", async () => {
  const { response, data } = await submit({ message: "Please save this" }, async () => {
    throw new Error("secret database connection details");
  });
  assert.equal(response.status, 500);
  assert.equal(data.code, "INTERNAL_ERROR");
  assert.doesNotMatch(JSON.stringify(data), /secret|database connection details/i);
});
