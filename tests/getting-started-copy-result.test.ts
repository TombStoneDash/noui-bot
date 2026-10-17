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

const source = await readFile(new URL("../src/app/getting-started/page.tsx", import.meta.url), "utf8");
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

function createHarness(clipboard) {
  const state = [];
  const timers = [];
  const navigator = { clipboard };
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    navigator,
    setTimeout(callback, delay) { timers.push({ callback, delay }); },
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => { state[index] = value; }];
        },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { default: "Link" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  // This export exists only in the in-memory test copy of the module.
  vm.runInContext(`${outputText}\nexports.__testCopyBlock = CopyBlock;`, context);

  const code = "npm install @forthebots/bazaar-sdk";
  const render = () => {
    cursor = 0;
    return context.exports.__testCopyBlock({ code, label: "npm / yarn / pnpm" });
  };
  const button = () => findNode(render(), (node) => node.type === "button");
  const alert = () => findNode(render(), (node) => node.props?.role === "alert");
  return { code, navigator, timers, render, button, alert };
}

test("pending clipboard writes do not confirm; fulfillment confirms and resets after two seconds", async () => {
  let resolveWrite;
  const write = new Promise((resolve) => { resolveWrite = resolve; });
  const copied = [];
  const harness = createHarness({ writeText(text) { copied.push(text); return write; } });

  assert.equal(findNode(harness.render(), (node) => node.type === "pre").props.children, harness.code);
  const attempt = harness.button().props.onClick();
  assert.deepEqual(copied, [harness.code]);
  assert.equal(harness.button().props.children, "Copy");
  assert.equal(harness.alert(), undefined);
  assert.equal(harness.timers.length, 0);

  resolveWrite();
  await attempt;
  assert.equal(harness.button().props.children, "Copied!");
  assert.equal(harness.timers.length, 1);
  assert.equal(harness.timers[0].delay, 2000);
  harness.timers[0].callback();
  assert.equal(harness.button().props.children, "Copy");
});

test("rejected clipboard writes show a readable failure and allow retry", async () => {
  const copied = [];
  let shouldReject = true;
  const harness = createHarness({
    writeText(text) {
      copied.push(text);
      return shouldReject ? Promise.reject(new Error("denied")) : Promise.resolve();
    },
  });

  await assert.doesNotReject(harness.button().props.onClick());
  assert.equal(harness.button().props.children, "Copy");
  assert.match(harness.alert().props.children, /Select the snippet manually/);
  assert.equal(harness.timers.length, 0);

  shouldReject = false;
  await assert.doesNotReject(harness.button().props.onClick());
  assert.equal(harness.alert(), undefined);
  assert.equal(harness.button().props.children, "Copied!");
  assert.deepEqual(copied, [harness.code, harness.code]);
});

test("missing clipboard access shows failure and allows retry when access returns", async () => {
  const harness = createHarness(undefined);

  await assert.doesNotReject(harness.button().props.onClick());
  assert.equal(harness.button().props.children, "Copy");
  assert.match(harness.alert().props.children, /Select the snippet manually/);
  assert.equal(harness.timers.length, 0);

  const copied = [];
  harness.navigator.clipboard = { writeText(text) { copied.push(text); return Promise.resolve(); } };
  await assert.doesNotReject(harness.button().props.onClick());
  assert.equal(harness.alert(), undefined);
  assert.equal(harness.button().props.children, "Copied!");
  assert.deepEqual(copied, [harness.code]);
});
