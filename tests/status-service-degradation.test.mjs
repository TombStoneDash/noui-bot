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
const source = await readFile(new URL("../src/app/status/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function walk(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
  } else if (node && typeof node === "object") {
    visit(node);
    walk(node.props?.children, visit);
  }
}

function serviceRows(tree) {
  const rows = [];
  walk(tree, (node) => {
    if (node.type !== "div" || !Array.isArray(node.props?.children)) return;
    const [details, status] = node.props.children;
    if (details?.type !== "div" || status?.type !== "span") return;
    const [name, path] = details.props?.children ?? [];
    if (name?.type !== "span" || path?.type !== "span") return;
    if (typeof path.props.children !== "string" || !path.props.children.startsWith("/api/bazaar")) return;
    rows.push({ name: name.props.children, label: status.props.children, color: status.props.className });
  });
  return rows;
}

function createPage(fetchResult) {
  const state = [];
  let cursor = 0;
  let effect;
  let pending;
  const requests = [];
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    Date,
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => {
            state[index] = typeof value === "function" ? value(state[index]) : value;
          }];
        },
        useCallback(fn) {
          return (...args) => { pending = fn(...args); return pending; };
        },
        useEffect(fn) { effect = fn; },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { default: "a" };
      throw new Error(`Unexpected import: ${name}`);
    },
    fetch(path) {
      requests.push(path);
      return fetchResult();
    },
    setInterval() { return 1; },
    clearInterval() {},
  });
  vm.runInContext(outputText, context);
  return {
    render() { cursor = 0; return context.exports.default(); },
    async check() {
      const cleanup = effect();
      await pending;
      cleanup();
      assert.deepEqual(requests, ["/api/bazaar/health"]);
    },
  };
}

function assertRows(tree, label, color) {
  const rows = serviceRows(tree);
  assert.deepEqual(rows.map((row) => row.name), [
    "Bazaar API", "Billing Proxy", "Tool Catalog", "Usage & Metering", "Provider Registration",
  ]);
  for (const row of rows) {
    assert.equal(row.label, label, `${row.name} label`);
    assert.ok(row.color.includes(color), `${row.name} color: ${row.color}`);
  }
}

test("service rows show checking before the first health response", () => {
  const page = createPage(() => { throw new Error("fetch should not run during render"); });
  assertRows(page.render(), "checking", "text-white/30");
});

for (const [healthStatus, label, color] of [
  ["ok", "operational", "text-emerald-400"],
  ["degraded", "degraded", "text-amber-400"],
]) {
  test(`${healthStatus} response sets all service rows to ${label}`, async () => {
    const page = createPage(async () => ({
      json: async () => ({
        status: healthStatus,
        provider_count: 3,
        tool_count: 7,
        uptime_seconds: 60,
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
    }));
    page.render();
    await page.check();
    const tree = page.render();
    assertRows(tree, label, color);
    if (healthStatus === "degraded") {
      assert.equal(serviceRows(tree).some((row) => row.label === "operational"), false);
    }
  });
}

test("fetch rejection sets all service rows to down", async () => {
  const page = createPage(async () => { throw new Error("unreachable"); });
  page.render();
  await page.check();
  assertRows(page.render(), "down", "text-red-400");
});
