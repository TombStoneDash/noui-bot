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

async function renderPage(path, imports) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: "page.tsx",
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name in imports) return imports[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  return context.exports.default();
}

function findNodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((child) => findNodes(child, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [
    ...(predicate(tree) ? [tree] : []),
    ...findNodes(tree.props?.children, predicate),
  ];
}

test("roadmap waitlist link resolves to the homepage email-capture section", async () => {
  const [home, roadmap] = await Promise.all([
    renderPage("../src/app/page.tsx", {
      "@/components/RevealWrapper": {
        RevealWrapper: "RevealWrapper",
        AnimatedSection: "AnimatedSection",
        AnimatedHero: "AnimatedHero",
      },
      "@/components/BazaarStatus": { BazaarStatus: "BazaarStatus" },
      "@/components/WaitlistForm": { WaitlistForm: "WaitlistForm" },
    }),
    renderPage("../src/app/roadmap/page.tsx", {
      "framer-motion": { motion: new Proxy({}, { get: (_target, name) => `motion.${String(name)}` }) },
      "next/link": { default: "Link" },
    }),
  ]);

  const targets = findNodes(home, (node) => node.props?.id === "waitlist");
  assert.equal(targets.length, 1, "homepage should have exactly one waitlist target");
  const target = targets[0];
  assert.equal(target.type, "section", "target should be the outer email-capture section");
  assert.equal(findNodes(target, (node) => node.type === "WaitlistForm").length, 1);
  assert.equal(findNodes(target, (node) => node.type === "h2" &&
    node.props?.children?.trim() === "Stay Updated").length, 1);

  const links = findNodes(roadmap, (node) => node.type === "Link" &&
    node.props?.children?.trim() === "Join the Waitlist");
  assert.equal(links.length, 1, "roadmap should have one Join the Waitlist link");
  const href = new URL(links[0].props.href, "https://example.test/roadmap");
  assert.equal(href.pathname, "/");
  assert.equal(href.hash, `#${target.props.id}`);
});
