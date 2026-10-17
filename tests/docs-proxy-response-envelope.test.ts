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

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const source = await read("../src/app/docs/page.tsx");
const schema = JSON.parse(await read("../public/specs/mcp-billing-v1/billing-envelope.schema.json"));
const fixture = JSON.parse(await read("../public/specs/mcp-billing-v1/fixtures/billing-envelope.fixture.json"));
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

const jsx = (type, props) => ({ type, props });
const context = vm.createContext({
  exports: {},
  require(name) {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    throw new Error("Unexpected import: " + name);
  },
});
vm.runInContext(outputText, context);

function findNode(tree, predicate) {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  } else if (tree && typeof tree === "object") {
    if (predicate(tree)) return tree;
    return findNode(tree.props?.children, predicate);
  }
  return undefined;
}

test("proxy documentation renders the committed billing response envelope", () => {
  const page = context.exports.default();
  const endpoint = findNode(
    page,
    (node) => node.type?.name === "Endpoint" && node.props?.path === "/api/bazaar/proxy",
  );
  assert.ok(endpoint, "proxy Endpoint exists");

  const response = JSON.parse(endpoint.props.response);
  assert.deepEqual(Object.keys(response).sort(), [...schema.required].sort());
  assert.equal(Object.hasOwn(response, "usage"), false);
  assert.deepEqual(Object.keys(response.result).sort(), Object.keys(fixture.result).sort());
  assert.ok(Array.isArray(response.result.content));
  assert.deepEqual(response.result.content.map(({ type }) => type), ["text"]);
  assert.equal(typeof response.result.content[0].text, "string");

  const meta = response.meta;
  const metaSchema = schema.properties.meta;
  assert.deepEqual(Object.keys(meta).sort(), [...metaSchema.required].sort());
  assert.deepEqual(Object.keys(meta).sort(), Object.keys(fixture.meta).sort());
  assert.equal(meta.tool, "web_search");
  assert.equal(meta.provider, "SearchCo");
  for (const field of ["tool", "provider", "cost"]) {
    assert.equal(typeof meta[field], "string", field);
  }
  for (const field of ["cost_cents", "latency_ms", "remaining_balance_cents"]) {
    assert.equal(typeof meta[field], "number", field);
    assert.ok(Number.isInteger(meta[field]) && meta[field] >= 0, field);
  }
  assert.equal(meta.cost_cents, 1);
  assert.equal(meta.cost, "$" + (meta.cost_cents / 100).toFixed(4));
  assert.equal(meta.cost, "$0.0100");
});
