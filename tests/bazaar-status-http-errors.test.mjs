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
const source = await readFile(new URL("../src/components/BazaarStatus.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "BazaarStatus.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

async function renderResponse(fetchResponse) {
  let state;
  let initialized = false;
  let effect;
  let mounted = false;
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
          if (!initialized) {
            state = initial;
            initialized = true;
          }
          return [state, (value) => { state = value; }];
        },
        useEffect(callback) {
          if (!mounted) effect = callback;
        },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  assert.equal(context.exports.BazaarStatus(), null, "Badge starts hidden");
  mounted = true;
  effect();
  // Drain the fetch/JSON promise chain, including its rejection handler.
  await new Promise((resolve) => setImmediate(resolve));
  return context.exports.BazaarStatus();
}

function response(payload, status = 200) {
  return async () => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object") return textContent(node.props?.children);
  return node == null ? "" : String(node);
}

for (const payload of [{ error: true }, { tools: [{ provider: { id: "atlas" } }] }]) {
  test(`HTTP 500 hides the badge with ${"tools" in payload ? "a tools array" : "an error payload"}`, async () => {
    let parsed = false;
    const tree = await renderResponse(async () => ({
      ok: false,
      status: 500,
      json: async () => { parsed = true; return payload; },
    }));
    assert.equal(tree, null);
    assert.equal(parsed, false, "Failed HTTP responses must not be parsed");
  });
}

test("invalid JSON hides the badge", async () => {
  assert.equal(await renderResponse(async () => ({
    ok: true,
    json: async () => JSON.parse("{invalid"),
  })), null);
});

for (const payload of [null, {}, { error: true }, { tools: null }, { tools: {} }, { tools: "" }, { tools: 0 }]) {
  test(`malformed payload ${JSON.stringify(payload)} hides the badge`, async () => {
    assert.equal(await renderResponse(response(payload)), null);
  });
}

test("network rejection hides the badge", async () => {
  assert.equal(await renderResponse(async () => { throw new Error("Network failure"); }), null);
});

for (const [label, tools, expected] of [
  ["empty success", [], "0 tools live from 0 providers"],
  ["two tools sharing a provider", [{ provider: { id: "atlas" } }, { provider: { id: "atlas" } }], "2 tools live from 1 provider"],
  ["distinct providers", [{ provider: { id: "atlas" } }, { provider: { id: "beacon" } }], "2 tools live from 2 providers"],
]) {
  test(`${label} preserves counts and wording`, async () => {
    const tree = await renderResponse(response({ tools }));
    assert.ok(tree, "Successful catalog renders the badge");
    assert.equal(textContent(tree), expected);
    assert.match(tree.props.children[0].props.className, /bg-green-500/);
  });
}
