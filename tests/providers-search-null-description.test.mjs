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
  // Support worktrees with dependencies installed in the factory package.
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}
const source = await readFile(new URL("../src/app/providers/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function provider(id, name, descriptions) {
  return {
    id, name, verified: false, totalCalls: 0, avgUptime: 0,
    tools: descriptions.map((description, index) => ({
      id: `${id}-${index}`, tool_name: `${id}_${index}`,
      display_name: index === 0 ? "Orbit Lookup" : "Signal Reader",
      description, category: "utilities",
      provider: { id, name, verified: false },
      pricing: { model: "free", price_cents: 0, price: "Free", free_tier_calls: 100 },
      stats: { total_calls: 0, avg_latency_ms: null, uptime_pct: null },
    })),
  };
}

function walk(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
  } else if (node && typeof node === "object") {
    visit(node);
    walk(node.props?.children, visit);
  }
}

function renderSearch(providers, query) {
  // Seed the loaded catalog state; skip the fetching effect to keep this local.
  const state = [providers, false, ""];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "react") return {
        useState() {
          const index = cursor++;
          assert.ok(index < state.length, "Unexpected page hook");
          return [state[index], (value) => { state[index] = value; }];
        },
        useEffect() {},
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { default: "a" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  const initialTree = context.exports.default();
  let searchInput;
  walk(initialTree, (node) => {
    if (node.type === "input") searchInput = node;
  });
  assert.ok(searchInput, "Page should render its search input");
  searchInput.props.onChange({ target: { value: query } });
  cursor = 0;
  const tree = context.exports.default();
  const ids = [];
  let noMatches = false;
  walk(tree, (node) => {
    // Inspect the provider cards selected by the actual page's filter.
    if (typeof node.type === "function" && node.props.provider) {
      ids.push(node.props.provider.id);
    }
    if (node.props.children === "No providers match your search.") noMatches = true;
  });
  return { ids, noMatches };
}

for (const description of [null, ""]) {
  const label = description === null ? "null" : "empty";
  const fixture = provider("atlas", "Atlas Labs", [description]);
  test(`${label} description with an unmatched query renders the empty result`, () => {
    assert.deepEqual(renderSearch([fixture], "missing-term"), { ids: [], noMatches: true });
  });
  test(`${label} description preserves case-insensitive provider name matches`, () => {
    assert.deepEqual(renderSearch([fixture], "aTlAs"), { ids: ["atlas"], noMatches: false });
  });
  test(`${label} description preserves case-insensitive tool display name matches`, () => {
    assert.deepEqual(renderSearch([fixture], "oRbIt"), { ids: ["atlas"], noMatches: false });
  });
}

const catalog = [
  provider("atlas", "Atlas Labs", [null]),
  provider("beacon", "Beacon Labs", [""]),
  provider("comet", "Comet Labs", [null, "Tracks Galactic weather"]),
];

test("real descriptions match case-insensitively after an earlier null-description tool", () => {
  assert.deepEqual(renderSearch(catalog, "gAlAcTiC"), { ids: ["comet"], noMatches: false });
});

test("an unmatched query excludes every provider in a mixed catalog", () => {
  assert.deepEqual(renderSearch(catalog, "missing-term"), { ids: [], noMatches: true });
});

test("null descriptions are not matched as the literal string null", () => {
  assert.deepEqual(renderSearch(catalog, "null"), { ids: [], noMatches: true });
});

test("an empty query preserves every provider and catalog order", () => {
  assert.deepEqual(renderSearch(catalog, ""), {
    ids: ["atlas", "beacon", "comet"], noMatches: false,
  });
});
