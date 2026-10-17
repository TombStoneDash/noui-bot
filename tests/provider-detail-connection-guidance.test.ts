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

const source = await readFile(new URL("../src/app/bazaar/[provider]/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

const provider = {
  slug: "fixture-tool",
  name: "Fixture Tool",
  description: "A fixture provider",
  category: "tools",
  github: "https://example.test/fixture-tool",
  install: "npx fixture-tool --fixture-option",
  tools: ["fixture_action"],
  example: "fixture example",
};
const notFoundError = new Error("NEXT_NOT_FOUND");
const jsx = (type, props) => ({ type, props });
const context = vm.createContext({
  exports: {},
  require(name) {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "next/link") return { default: "Link" };
    if (name === "next/navigation") return { notFound: () => { throw notFoundError; } };
    if (name === "../providers") return {
      PROVIDERS: [provider],
      getProvider: (slug) => slug === provider.slug ? provider : undefined,
    };
    throw new Error(`Unexpected import: ${name}`);
  },
});
vm.runInContext(outputText, context);

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== "object") return [];
  return [node, ...descendants(node.props?.children)];
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  return textContent(node.props?.children);
}

function sectionNamed(tree, name) {
  return descendants(tree).find((node) => node.type === "section" &&
    descendants(node).some((child) => child.type === "h2" && textContent(child).trim() === name));
}

test("provider detail guides consumers to the live catalog and developer guide", async () => {
  const page = await context.exports.default({ params: Promise.resolve({ provider: provider.slug }) });
  const integration = sectionNamed(page, "Use through Bazaar");
  assert.ok(integration, "integration section renders");

  const links = descendants(integration).filter((node) => node.type === "Link");
  assert.deepEqual(links.map((link) => link.props.href), ["/marketplace", "/get-started"]);
  assert.match(textContent(integration), /tool must be listed in the live catalog/i);
  assert.match(textContent(integration), /static provider page and its slug do not establish availability/i);
  assert.doesNotMatch(textContent(integration), /api\/bazaar\/connect|curl\s+-X\s+POST|Authorization:\s*Bearer/i);

  const install = sectionNamed(page, "Install");
  assert.ok(install, "installation section still renders");
  assert.match(textContent(install), /npx fixture-tool --fixture-option/);
});

test("unknown provider still calls notFound", async () => {
  await assert.rejects(
    context.exports.default({ params: Promise.resolve({ provider: "unknown-provider" }) }),
    (error) => error === notFoundError,
  );
});
