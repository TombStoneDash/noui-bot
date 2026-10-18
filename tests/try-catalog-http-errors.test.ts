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

const source = await readFile(new URL("../src/app/get-started/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

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

async function runWidget(fetchResponse) {
  const state = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    fetch(url) {
      assert.equal(url, "/api/bazaar/catalog");
      return fetchResponse();
    },
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => { state[index] = value; }];
        },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { __esModule: true, default: "a" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);

  const page = context.exports.default();
  const widgetNode = findNode(page, (node) => node.type?.name === "TryItWidget");
  assert.ok(widgetNode, "Get Started page renders the actual Try It widget");
  const render = () => { cursor = 0; return widgetNode.type(); };
  const button = (tree) => findNode(tree, (node) => node.type === "button");
  const initial = render();
  assert.equal(button(initial).props.children, "Run this command");

  const click = button(initial).props.onClick();
  assert.equal(button(render()).props.disabled, true, "button is disabled while running");
  await click;

  const finished = render();
  assert.equal(button(finished).props.disabled, false, "button is enabled for retry");
  assert.equal(button(finished).props.children, "Run again");
  const output = findNode(finished, (node) => node.type === "pre");
  assert.ok(output, "widget displays a result");
  return JSON.parse(output.props.children);
}

function response(payload, status = 200) {
  return async () => ({ ok: status >= 200 && status < 300, json: async () => payload });
}

for (const [label, status, payload] of [
  ["HTTP 500 without tools", 500, { error: true, message: "Unavailable" }],
  ["HTTP 500 with tools", 500, { tools: [{ provider: { id: "atlas" } }] }],
  ["HTTP 429", 429, { tools: [] }],
]) {
  test(`${label} uses the error display`, async () => {
    assert.deepEqual(await runWidget(response(payload, status)), { error: "Failed to reach API" });
  });
}

for (const [label, payload] of [
  ["missing tools", { error: true }],
  ["non-array tools", { tools: {} }],
  ["null payload", null],
]) {
  test(`${label} uses the error display`, async () => {
    assert.deepEqual(await runWidget(response(payload)), { error: "Failed to reach API" });
  });
}

test("empty catalog keeps the successful zero counts", async () => {
  assert.deepEqual(await runWidget(response({ tools: [] })), {
    status: "ok", tools: 0, providers: 0, sample: null,
  });
});

test("populated catalog keeps provider count and first-tool sample", async () => {
  assert.deepEqual(await runWidget(response({ tools: [
    { display_name: "Search", pricing: { price: 0.02 }, provider: { id: "atlas", name: "Atlas" } },
    { display_name: "Summarize", pricing: { price: 0.03 }, provider: { id: "atlas", name: "Atlas" } },
    { display_name: "Translate", pricing: { price: 0.04 }, provider: { id: "beacon", name: "Beacon" } },
  ] })), {
    status: "ok", tools: 3, providers: 2,
    sample: { name: "Search", price: 0.02, provider: "Atlas" },
  });
});

test("invalid JSON uses the error display", async () => {
  assert.deepEqual(await runWidget(async () => ({
    ok: true, json: async () => JSON.parse("{invalid"),
  })), { error: "Failed to reach API" });
});

test("rejected fetch uses the error display", async () => {
  assert.deepEqual(await runWidget(async () => { throw new Error("Network failure"); }),
    { error: "Failed to reach API" });
});
