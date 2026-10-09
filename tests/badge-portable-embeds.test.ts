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
const source = readFileSync(new URL("../src/app/botproof/badge/page.tsx", import.meta.url), "utf8");
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
}, { filename: "page.js" });

function render(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(render);
  if (!node || typeof node !== "object" || !("type" in node)) return node;
  const element = node as Element;
  if (typeof element.type === "function") {
    return render((element.type as (props: Record<string, unknown>) => unknown)(element.props));
  }
  return { ...element, props: { ...element.props, children: render(element.props.children) } };
}

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

test("badge embeds use their displayed SVGs and documented local Markdown files", () => {
  const tree = render(page.default!());
  const previews = findAll(tree, (element) =>
    element.type === "div" &&
    typeof element.props.className === "string" &&
    element.props.className.includes("bg-[#080808] border border-[#1a1a1a] mb-6")
  );
  const variants = [
    { label: "Standard — Full width", filename: "botproof-badge.svg", width: "200" },
    { label: "Compact — Inline use", filename: "botproof-badge-compact.svg", width: "120" },
    { label: "Dark Terminal — For dark backgrounds", filename: "botproof-badge-dark.svg", width: "160" },
    { label: "Shield — GitHub README style", filename: "botproof-badge-shield.svg", width: "180" },
  ];
  assert.equal(previews.length, variants.length);
  assert.equal(new Set(variants.map(({ filename }) => filename)).size, variants.length);

  for (const [index, { label, filename, width }] of variants.entries()) {
    const preview = previews[index];
    assert.ok(textContent(preview).includes(label));
    const svgPreview = findAll(preview, (element) =>
      typeof element.props.dangerouslySetInnerHTML === "object"
    )[0];
    const displayedSvg = (svgPreview.props.dangerouslySetInnerHTML as { __html: string }).__html;
    assert.ok(displayedSvg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}"`));

    const snippets = findAll(preview, (element) => element.type === "pre").map(textContent);
    assert.equal(snippets.length, 3);
    const [svgCode, html, markdown] = snippets;
    assert.equal(svgCode, displayedSvg);
    assert.ok(html.includes(displayedSvg), `${label} HTML must contain its displayed SVG`);
    assert.ok(html.startsWith('<a href="https://noui.bot/bot-captcha/leaderboard"'));
    assert.ok(html.endsWith("</a>"));
    assert.ok(markdown.includes(`](${filename})](https://noui.bot/bot-captcha/leaderboard)`));
    assert.ok(textContent(preview).includes(`save the SVG shown above as ${filename} alongside your Markdown document before using the snippet.`));
    for (const snippet of snippets) {
      assert.doesNotMatch(snippet, /\/api\/v1\/botproof\/badge[^\s)]*\.svg/);
    }
  }

  assert.ok(textContent(tree).includes("These are static badges, not personalized verification lookups."));
});
