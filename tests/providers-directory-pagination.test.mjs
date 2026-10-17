import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));
const source = await readFile(new URL("../src/app/providers/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});

function tool(id, providerId = "first") {
  return {
    id, tool_name: id, display_name: id, description: null, category: "other",
    provider: { id: providerId, name: providerId, verified: false },
    pricing: { model: "free", price_cents: 0, price: "Free", free_tier_calls: 0 },
    stats: { total_calls: 1, avg_latency_ms: null, uptime_pct: null },
  };
}

function walk(node, visit) {
  if (Array.isArray(node)) node.forEach((child) => walk(child, visit));
  else if (node && typeof node === "object") {
    visit(node);
    walk(node.props?.children, visit);
  }
}

async function renderCatalog(responses) {
  const urls = [];
  const state = [];
  let cursor = 0;
  let effect;
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    fetch: async (url) => {
      urls.push(url);
      const reply = responses[urls.length - 1];
      assert.ok(reply, `Unexpected catalog request: ${url}`);
      return { ok: reply.ok ?? true, json: async () => reply.body };
    },
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => { state[index] = value; }];
        },
        useEffect(callback) { effect = callback; },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { default: "a" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  context.exports.default();
  effect();
  for (let attempt = 0; state[1] && attempt < 20; attempt++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(state[1], false, "Catalog load should settle");
  cursor = 0;
  const tree = context.exports.default();
  const ids = [];
  const text = [];
  walk(tree, (node) => {
    if (typeof node.type === "function" && node.props.provider) ids.push(node.props.provider.id);
    if (typeof node.props?.children === "string" || typeof node.props?.children === "number") {
      text.push(String(node.props.children));
    }
  });
  return { urls, ids, text, providers: state[0] };
}

function page(tools, offset) {
  return { body: { tools, total: tools.length, limit: 50, offset } };
}

const firstFifty = Array.from({ length: 50 }, (_, index) => tool(`tool-${index}`));

test("loads a provider on page two and computes complete totals", async () => {
  const result = await renderCatalog([
    page(firstFifty, 0),
    page([tool("tool-50", "second"), tool("tool-50", "second")], 50),
  ]);
  assert.deepEqual(result.urls, [
    "/api/bazaar/catalog?limit=50&offset=0",
    "/api/bazaar/catalog?limit=50&offset=50",
  ]);
  assert.deepEqual(result.ids, ["first", "second"]);
  assert.equal(result.providers[0].tools.length, 50);
  assert.equal(result.providers[1].tools.length, 1, "duplicate IDs should be counted once");
  assert.ok(result.text.includes("51"), "tool total should include page two without duplicates");
  assert.ok(result.text.includes("2"), "provider total should include page two");
});

test("an exact page boundary fetches the next empty page", async () => {
  const result = await renderCatalog([page(firstFifty, 0), page([], 50)]);
  assert.equal(result.urls.length, 2);
  assert.deepEqual(result.ids, ["first"]);
  assert.ok(result.text.includes("50"));
});

test("a truly empty catalog has its own empty state", async () => {
  const result = await renderCatalog([page([], 0)]);
  assert.deepEqual(result.ids, []);
  assert.ok(result.text.includes("No providers registered yet."));
});

test("a later page failure shows an error without partial cards or totals", async () => {
  const result = await renderCatalog([page(firstFifty, 0), { ok: false }]);
  assert.deepEqual(result.ids, []);
  assert.ok(result.text.includes("Unable to load providers. Please try again later."));
  assert.ok(!result.text.includes("No providers registered yet."));
  assert.ok(!result.text.includes("50"));
});

test("malformed later payload shows the error state", async () => {
  const result = await renderCatalog([page(firstFifty, 0), { body: { tools: null, total: 0, limit: 50, offset: 50 } }]);
  assert.deepEqual(result.ids, []);
  assert.ok(result.text.includes("Unable to load providers. Please try again later."));
});
