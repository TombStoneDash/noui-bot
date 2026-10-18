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

const source = await readFile(new URL("../src/components/RevealWrapper.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "RevealWrapper.tsx",
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

test("homepage links are inert until reveal while staying mounted", () => {
  const state = [];
  const timers = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const motion = new Proxy({}, { get: (_target, name) => `motion.${String(name)}` });
  const context = vm.createContext({
    exports: {},
    setTimeout(callback, delay) { timers.push({ callback, delay }); },
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => { state[index] = value; }];
        },
        useRef(initial) { return { current: initial }; },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "framer-motion") return { motion, AnimatePresence: "AnimatePresence" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);

  const link = jsx("a", { href: "/home", children: "Home" });
  const render = () => { cursor = 0; return context.exports.RevealWrapper({ children: link }); };
  const content = (tree) => findNode(tree, (node) => node.type === "div" && node.props?.["aria-hidden"] !== undefined);

  const initial = render();
  const hidden = content(initial);
  assert.ok(hidden, "content container should render before reveal");
  assert.equal(hidden.props.inert, true);
  assert.equal(hidden.props["aria-hidden"], true);
  assert.strictEqual(findNode(hidden, (node) => node === link), link);

  const revealButton = findNode(initial, (node) => node.type === "motion.button");
  assert.ok(revealButton, "reveal button should be present");
  revealButton.props.onClick();
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 800);

  const revealed = render();
  const visible = content(revealed);
  assert.ok(visible, "content container should remain after reveal");
  assert.equal(visible.props.inert, false);
  assert.equal(visible.props["aria-hidden"], false);
  assert.strictEqual(findNode(visible, (node) => node === link), link);
});
