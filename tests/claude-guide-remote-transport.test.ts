import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));
const source = readFileSync(new URL("../src/app/docs/guides/claude-setup/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

type Element = { type: unknown; props: Record<string, unknown> };
const jsx = (type: unknown, props: Record<string, unknown>): Element => ({ type, props });
const page: { default?: () => Element } = {};
vm.runInNewContext(outputText, {
  exports: page,
  require(name: string) {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    throw new Error(`Unexpected dependency: ${name}`);
  },
}, { filename: "claude-setup-page.js" });

function findAll(node: unknown, predicate: (element: Element) => boolean): Element[] {
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate));
  if (!node || typeof node !== "object" || !("type" in node)) return [];
  const element = node as Element;
  return [...(predicate(element) ? [element] : []), ...findAll(element.props.children, predicate)];
}

function textContent(node: unknown): string {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textContent((node as Element).props.children);
  }
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

test("Claude guide documents the packaged stdio connection only", () => {
  const tree = page.default!();
  const snippets = findAll(tree, (element) => element.type === "pre").map(textContent);
  const mcpConfigs = snippets.filter((snippet) => snippet.includes('"mcpServers"'));
  assert.equal(mcpConfigs.length, 1);

  const config = JSON.parse(mcpConfigs[0]);
  const server = config.mcpServers["noui-bazaar"];
  assert.equal(server.command, "npx");
  assert.deepEqual(Array.from(server.args), ["-y", "@forthebots/mcp-server"]);
  assert.equal(server.env.NOUI_API_KEY, "bz_your_key_here");
  assert.equal(server.url, undefined);
  assert.equal(server.headers, undefined);
  assert.ok(snippets.every((snippet) => !snippet.includes('"url": "https://noui.bot/api/v1"')));

  const visibleText = textContent(tree).replace(/\s+/g, " ");
  assert.match(visibleText, /This guide uses the packaged stdio server\./);
  assert.match(visibleText, /https:\/\/noui\.bot\/api\/v1 is an API index, not a supported desktop MCP transport\./);
});
