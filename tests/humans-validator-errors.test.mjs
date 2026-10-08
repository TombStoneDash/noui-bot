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
  // Also support worktrees with dependencies installed in the factory package.
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}
const source = await readFile(new URL("../src/app/validate/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function loadValidator(fetch) {
  const context = vm.createContext({
    exports: {},
    fetch,
    Error,
    require(name) {
      if (name === "react") return { useState() { throw new Error("Unexpected render"); } };
      if (name === "react/jsx-runtime") return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  // Expose the private function only in this in-memory test evaluation.
  vm.runInContext(`${outputText}\nglobalThis.testValidateUrl = validateUrl;`, context);
  assert.deepEqual(Object.keys(context.exports), ["default"]);
  return context.testValidateUrl;
}

const target = "https://example.com/.well-known/humans.txt";
async function validate(response) {
  const requests = [];
  const validateUrl = loadValidator(async (url) => {
    requests.push(url);
    return response;
  });
  const result = await validateUrl(" example.com/ ");
  assert.deepEqual(requests, [`/api/validate-humans-txt?url=${encodeURIComponent(target)}`]);
  assert.equal(result.url, target);
  assert.equal(typeof result.responseTime, "number");
  assert.ok(result.responseTime >= 0);
  return result;
}

function assertFailure(result, status, label, explanation) {
  assert.equal(result.status, status);
  assert.equal(result.score, 0);
  assert.equal(result.data, undefined);
  assert.equal(result.checks.length, 1);
  assert.equal(result.checks[0].status, "fail");
  assert.equal(result.checks[0].label, label);
  assert.match(result.checks[0].detail, explanation);
  if (status !== "not_found") {
    assert.doesNotMatch(result.checks[0].detail, /no humans\.txt|missing|adding a humans/i);
  }
}

for (const [httpStatus, status, label, explanation, message] of [
  [404, "not_found", "/.well-known/humans.txt exists", /No humans\.txt found/, "HTTP 404"],
  [422, "invalid", "Valid JSON response", /exists but is not valid JSON/, "Response is not valid JSON"],
  [502, "error", "Validation request", /request failed/, "Upstream fetch failed"],
  [429, "error", "Validation request", /request failed/, "Too many requests"],
]) {
  test(`HTTP ${httpStatus} is ${status} with accurate checks and the API error`, async () => {
    const result = await validate(Response.json({ error: `  ${message}  ` }, { status: httpStatus }));
    assertFailure(result, status, label, explanation);
    assert.equal(result.error, message);
    assert.ok(result.checks[0].detail.includes(message));
    assert.match(result.checks[0].detail, new RegExp(`HTTP ${httpStatus}`));
  });
}

for (const status of [404, 422, 502, 429]) {
  for (const body of ["<html>Unavailable</html>", "", "null", "[]", '"error"', "{}",
    '{"error":42}', '{"error":{"message":"bad"}}', '{"error":"   "}']) {
    test(`HTTP ${status} falls back safely for malformed error body ${JSON.stringify(body)}`, async () => {
      const result = await validate(new Response(body, { status }));
      const expectedStatus = status === 404 ? "not_found" : status === 422 ? "invalid" : "error";
      const expectedLabel = status === 404 ? "/.well-known/humans.txt exists"
        : status === 422 ? "Valid JSON response" : "Validation request";
      const explanation = status === 404 ? /No humans\.txt found/
        : status === 422 ? /exists but is not valid JSON/ : /request failed/;
      assertFailure(result, expectedStatus, expectedLabel, explanation);
      assert.match(result.error, explanation);
      assert.equal(result.checks[0].detail, `HTTP ${status} — ${result.error}`);
    });
  }
}

test("network rejection is a request failure, not evidence of a missing file", async () => {
  const validateUrl = loadValidator(async () => { throw new Error("Network unavailable"); });
  const result = await validateUrl("example.com");
  assertFailure(result, "error", "Validation request", /request failed.*try again/);
  assert.equal(result.error, "Network unavailable");
  assert.equal(result.url, target);
  assert.equal(typeof result.responseTime, "number");
});

test("a valid document retains successful checks, data, and a score of 100", async () => {
  const document = {
    platform: { name: "Example" },
    operator: { name: "Human", verifiedHuman: true, github: "https://github.com/example" },
    trust: { openSource: true, billingSpec: "v1", vendorCapture: false },
    message: "Hello from a human",
  };
  const result = await validate(Response.json(document));
  assert.equal(result.status, "found");
  assert.equal(result.score, 100);
  assert.deepEqual(result.data, document);
  assert.equal(result.error, undefined);
  assert.equal(result.checks.length, 8);
  assert.ok(result.checks.every((check) => check.status === "pass"));
});

test("a sparse valid document retains partial scoring", async () => {
  const result = await validate(Response.json({ platform: { name: "Example" } }));
  assert.equal(result.status, "found");
  assert.equal(result.score, 40);
  assert.equal(result.checks.length, 8);
  assert.equal(result.checks.filter((check) => check.status === "pass").length, 3);
});
