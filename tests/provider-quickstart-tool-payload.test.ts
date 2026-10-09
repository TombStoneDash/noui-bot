import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let ts: typeof import("typescript");
try {
  ts = require("typescript");
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "MODULE_NOT_FOUND") throw error;
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}

test("Step 2 renders a registrable tool payload with prices in cents", async () => {
  const source = await readFile(new URL("../src/app/docs/guides/provider-quickstart/page.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: "page.tsx",
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    require(name: string) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  type Node = { type: string | ((props: Record<string, unknown>) => unknown); props: Record<string, unknown> };
  function render(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(render);
    if (value === null || typeof value !== "object" || !("type" in value)) return value;
    const node = value as Node;
    if (typeof node.type === "function") return render(node.type(node.props));
    return { type: node.type, props: { ...node.props, children: render(node.props.children) } };
  }
  function find(value: unknown, predicate: (node: Node) => boolean): Node | undefined {
    if (Array.isArray(value)) return value.map((child) => find(child, predicate)).find(Boolean);
    if (value === null || typeof value !== "object" || !("type" in value)) return undefined;
    const node = value as Node;
    return predicate(node) ? node : find(node.props.children, predicate);
  }
  function textOf(value: unknown): string {
    if (Array.isArray(value)) return value.map(textOf).join("");
    if (value === null || value === undefined || typeof value === "boolean") return "";
    if (typeof value !== "object") return String(value);
    return textOf((value as Node).props.children);
  }
  const page = render(context.exports.default());

  const step = find(page, (node) => node.type === "section" &&
    textOf(find(node, (child) => child.type === "h2")) === "Step 2: List Your Tools");
  assert.ok(step, "Step 2 is rendered");
  const pre = find(step, (node) => node.type === "pre");
  assert.ok(pre, "Step 2 renders a curl snippet");
  const curl = textOf(pre);

  const endpoint = curl.match(/^curl -X POST (\S+)/m);
  assert.ok(endpoint, "curl has a POST URL");
  const url = new URL(endpoint[1]);
  assert.equal(url.pathname, "/api/bazaar/tools");
  assert.match(await readFile(new URL(`../src/app${url.pathname}/route.ts`, import.meta.url), "utf8"), /export async function POST\(/);
  assert.match(curl, /-H "Authorization: Bearer baz_sk_\.\.\."/);

  const data = curl.match(/-d '(\{[\s\S]*\})'/);
  assert.ok(data, "curl has a JSON body");
  const payload = JSON.parse(data[1]);
  assert.equal(payload.tools.length, 2);

  const displayedPrices = textOf(page).match(/\$(\d+\.\d+)\/query, \$(\d+\.\d+)\/operation/);
  assert.ok(displayedPrices, "the page displays both dollar examples");
  for (const [index, name, property, dollars] of [
    [0, "search_papers", "query", displayedPrices[1]],
    [1, "analyze_paper", "paper_id", displayedPrices[2]],
  ] as const) {
    const tool = payload.tools[index];
    assert.equal(tool.tool_name, name);
    assert.deepEqual(tool.input_schema, {
      type: "object",
      properties: { [property]: { type: "string" } },
    });
    assert.equal(tool.price_cents_override, Number(dollars) * 100);
    for (const obsolete of ["name", "pricePerCall", "inputSchema"]) {
      assert.equal(Object.hasOwn(tool, obsolete), false, `${name} must not use ${obsolete}`);
    }
  }
  assert.match(textOf(step), /price_cents_override to 0 for free tools/);
});
