import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Fresh worktrees may only have the factory package's existing dependencies.
const ts = require(require.resolve("typescript", {
  paths: [new URL("../", import.meta.url).pathname, new URL("../packages/noui-factory/", import.meta.url).pathname],
}));

const source = readFileSync(new URL("../src/app/marketplace/page.tsx", import.meta.url), "utf8");
const { outputText, diagnostics } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  reportDiagnostics: true,
});
assert.equal(diagnostics.length, 0);

// Each component instance has its own hook slots; JSX remains traversable and
// event handlers can be invoked without React DOM or a network connection.
function mountCatalog() {
  const frames = new Map();
  const effects = [];
  const requests = [];
  let current;
  let resolveFetch;
  let rejectFetch;
  const pending = new Promise((resolve, reject) => {
    resolveFetch = resolve;
    rejectFetch = reject;
  });
  const react = {
    useState(initial) {
      const frame = current;
      const slot = frame.cursor++;
      if (!(slot in frame.values)) {
        frame.values[slot] = typeof initial === "function" ? initial() : initial;
      }
      return [frame.values[slot], (value) => {
        frame.values[slot] = typeof value === "function" ? value(frame.values[slot]) : value;
      }];
    },
    useEffect(effect, deps) {
      const frame = current;
      const slot = frame.cursor++;
      const previous = frame.values[slot];
      if (!previous || deps.some((dep, index) => !Object.is(dep, previous[index]))) {
        effects.push(effect);
        frame.values[slot] = deps;
      }
    },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      throw new Error(`Unexpected import: ${name}`);
    },
    fetch(url) {
      requests.push(url);
      return pending;
    },
  });
  function expand(node, path = "root") {
    if (Array.isArray(node)) return node.map((child, i) => expand(child, `${path}.${child?.key ?? i}`));
    if (!node || typeof node !== "object") return node;
    if (typeof node.type === "function") {
      const frame = frames.get(path) ?? { values: [], cursor: 0 };
      frames.set(path, frame);
      frame.cursor = 0;
      current = frame;
      return expand(node.type(node.props), `${path}.render`);
    }
    return { ...node, props: { ...node.props, children: expand(node.props.children, `${path}.children`) } };
  }
  let tree;
  function render() {
    tree = expand(jsx(exports.default, {}));
    while (effects.length) effects.shift()();
    return tree;
  }
  render();
  return {
    get tree() { return tree; },
    get tools() { return frames.get("root").values[0]; },
    requests,
    render,
    async respond(response) { resolveFetch(response); await new Promise(setImmediate); render(); },
    async reject() { rejectFetch(new Error("Offline")); await new Promise(setImmediate); render(); },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return text(tree.props.children);
}
const cards = (app) => nodes(app.tree).filter((node) => node.type === "h3");
const emptyMessage = /No tools are available in the catalog yet\./;
const errorMessage = /Unable to load the catalog\. Please try again later\./;

function assertLoading(app) {
  assert.deepEqual(app.requests, ["/api/bazaar/catalog"]);
  assert.equal(app.tools.length, 0);
  assert.equal(cards(app).length, 0);
  assert.match(text(app.tree), /Loading catalog/);
  assert.doesNotMatch(text(app.tree), /calls metered|avg uptime|Quick integration|No tools|Unable to load/);
}
function assertUnavailable(app, message) {
  assert.equal(app.tools.length, 0);
  assert.equal(cards(app).length, 0);
  assert.match(text(app.tree), message);
  assert.doesNotMatch(text(app.tree), /Loading catalog|calls metered|avg uptime|✓ verified|Quick integration|No tools match/);
}
const tool = {
  id: "catalog-tool-1", tool_name: "catalog_lookup", display_name: "Catalog Lookup",
  description: "Look up a catalog record", category: "data",
  provider: { id: "catalog-provider", name: "Catalog Provider", verified: true },
  pricing: { model: "per_call", price_cents: 1, price: "$0.01/call", free_tier_calls: 10 },
  stats: { total_calls: 1200, avg_latency_ms: 20, uptime_pct: 99.5 },
};
const response = (tools) => ({ ok: true, json: async () => ({ tools }) });

test("empty success transitions from loading to an empty catalog", async () => {
  const app = mountCatalog();
  assertLoading(app);
  await app.respond(response([]));
  assertUnavailable(app, emptyMessage);
  assert.doesNotMatch(text(app.tree), errorMessage);
});

test("populated success preserves real cards, metrics, filtering, and integration examples", async () => {
  const app = mountCatalog();
  assertLoading(app);
  const second = { ...tool, id: "catalog-tool-2", tool_name: "catalog_search", display_name: "Catalog Search", category: "search" };
  await app.respond(response([tool, second]));
  assert.equal(app.tools.length, 2);
  assert.deepEqual(cards(app).map(text), [tool.display_name, second.display_name]);
  assert.match(text(app.tree), /2 tools.*1 providers.*2\.4K calls metered.*99\.5\s*% avg uptime/s);
  assert.doesNotMatch(text(app.tree), /Loading catalog|No tools|Unable to load/);
  const card = nodes(app.tree).find((node) => node.type === "div" && node.props.onClick && text(node).includes(tool.display_name));
  card.props.onClick();
  app.render();
  assert.match(text(app.tree), /"tool_name": "catalog_lookup"/);
  const search = () => nodes(app.tree).find((node) => node.type === "input");
  search().props.onChange({ target: { value: "missing tool" } });
  app.render();
  assert.equal(cards(app).length, 0);
  assert.match(text(app.tree), /No tools match your search/);
  assert.doesNotMatch(text(app.tree), emptyMessage);
  search().props.onChange({ target: { value: "CATALOG PROVIDER" } });
  app.render();
  assert.equal(cards(app).length, 2);
  nodes(app.tree).find((node) => node.type === "button" && text(node).includes("Data")).props.onClick();
  app.render();
  assert.deepEqual(cards(app).map(text), [tool.display_name]);
});

test("HTTP failure is an error even when its body contains tools", async () => {
  const app = mountCatalog();
  assertLoading(app);
  let parsed = false;
  await app.respond({ ok: false, status: 503, json: async () => { parsed = true; return { tools: [tool] }; } });
  assert.equal(parsed, false);
  assertUnavailable(app, errorMessage);
  assert.doesNotMatch(text(app.tree), emptyMessage);
});

test("invalid payloads fail without accepting malformed tools", async (t) => {
  for (const [name, payload] of Object.entries({
    null: null, missing: {}, nonArray: { tools: "tools" },
    nullTool: { tools: [null] }, missingFields: { tools: [{}] },
    badProvider: { tools: [{ ...tool, provider: null }] },
    badStats: { tools: [{ ...tool, stats: { ...tool.stats, total_calls: "1200" } }] },
    badPricing: { tools: [{ ...tool, pricing: null }] },
    mixed: { tools: [tool, { ...tool, display_name: 42 }] },
  })) {
    await t.test(name, async () => {
      const app = mountCatalog();
      assertLoading(app);
      await app.respond({ ok: true, json: async () => payload });
      assertUnavailable(app, errorMessage);
    });
  }
  await t.test("invalid JSON", async () => {
    const app = mountCatalog();
    await app.respond({ ok: true, json: async () => { throw new SyntaxError("Invalid JSON"); } });
    assertUnavailable(app, errorMessage);
  });
});

test("rejected fetch transitions from loading to a fetch error", async () => {
  const app = mountCatalog();
  assertLoading(app);
  await app.reject();
  assertUnavailable(app, errorMessage);
  assert.doesNotMatch(text(app.tree), emptyMessage);
});
