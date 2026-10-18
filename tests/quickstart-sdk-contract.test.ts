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

function transpile(source, fileName, jsx = false) {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: jsx ? ts.JsxEmit.ReactJSX : undefined,
    },
  }).outputText;
}

function findNode(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  } else if (node && typeof node === "object") {
    if (predicate(node)) return node;
    return findNode(node.props?.children, predicate);
  }
  return undefined;
}

test("the displayed quickstart SDK example runs against the repository SDK", async () => {
  const pageSource = await readFile(new URL("../src/app/docs/quickstart/page.tsx", import.meta.url), "utf8");
  const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
  const page = vm.createContext({
    exports: {},
    require(name) {
      assert.equal(name, "react/jsx-runtime");
      return { jsx, jsxs: jsx };
    },
  });
  vm.runInContext(transpile(pageSource, "page.tsx", true), page);
  const tree = page.exports.default();
  const usageBlock = findNode(tree, (node) =>
    node.type === "div" &&
    Array.isArray(node.props?.children) &&
    node.props.children[0]?.props?.children === "Usage" &&
    node.props.children[1]?.type === "pre"
  );
  assert.ok(usageBlock, "Usage code block must be rendered");
  const snippet = usageBlock.props.children[1].props.children.props.children;
  assert.equal(typeof snippet, "string", "run the code displayed inside the Usage block");

  const requests = [];
  const fixtureFetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, method: options.method, body: options.body });
    const fixtures = {
      "/api/bazaar/catalog": { tools: [], total: 0, timestamp: "2026-01-01T00:00:00Z" },
      "/api/bazaar/proxy": { result: { forecast: "sunny" }, meta: {} },
      "/api/v1/bazaar/usage/summary": { total_calls: 7, total_spend_cents: 1234 },
    };
    assert.ok(Object.hasOwn(fixtures, path), `Unexpected SDK request: ${path}`);
    return new Response(JSON.stringify(fixtures[path]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const sdkSource = await readFile(new URL("../packages/bazaar-sdk/src/index.ts", import.meta.url), "utf8");
  const sdk = vm.createContext({
    exports: {},
    fetch: fixtureFetch,
    AbortController,
    setTimeout,
    clearTimeout,
    URLSearchParams,
  });
  vm.runInContext(transpile(sdkSource, "index.ts"), sdk);

  const printed = [];
  const example = vm.createContext({
    exports: {},
    console: { log: (line) => printed.push(line) },
    require(name) {
      assert.equal(name, "@forthebots/bazaar-sdk");
      return sdk.exports;
    },
  });
  const [importLine, ...exampleLines] = snippet.split("\n");
  vm.runInContext(transpile(`${importLine}\nglobalThis.runSnippet = async () => {\n${exampleLines.join("\n")}\n};`, "usage.ts"), example);
  await example.runSnippet();

  assert.deepEqual(requests.map(({ path, method }) => [method, path]), [
    ["GET", "/api/bazaar/catalog"],
    ["POST", "/api/bazaar/proxy"],
    ["GET", "/api/v1/bazaar/usage/summary"],
  ]);
  assert.deepEqual(JSON.parse(requests[1].body), {
    tool_name: "weather_forecast",
    input: { location: "San Francisco, CA" },
  });
  assert.deepEqual(printed, ["Total calls: 7", "Total cost: $12.34"]);
});
