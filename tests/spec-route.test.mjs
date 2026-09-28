import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { markdownToHtml } from "../src/lib/markdown.ts";
import { GET } from "../src/app/spec.md/route.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const spec = await read("../SPEC.md");

for (const path of ["src/app/spec/page.tsx", "src/app/spec.md/route.ts"]) {
  test(`${path} statically serves SPEC.md`, async () => {
    const source = await read(`../${path}`);
    assert.match(source, /SPEC\.md/);
    assert.match(source, /export const dynamic = "force-static"/);
  });
}

test("shared markdown renderer renders the spec heading and code block", () => {
  const html = markdownToHtml(spec);
  assert.ok(html.includes("<h1>MCP Billing Spec v0.1</h1>"));
  assert.ok(html.includes("<pre><code"));
});

test("raw markdown response preserves SPEC.md and its response headers", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), spec);
  assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "public, s-maxage=300, stale-while-revalidate=600");
});

test("v1 draft uses the shared markdown renderer", async () => {
  const source = await read("../src/app/specs/mcp-billing-v1/page.tsx");
  assert.doesNotMatch(source, /function\s+markdownToHtml\s*\(/);
  assert.match(source, /import\s*\{\s*markdownToHtml\s*\}\s*from\s*["']@\/lib\/markdown["']/);
});

for (const path of [
  "src/app/page.tsx",
  "src/app/docs/page.tsx",
  "src/app/api/v1/route.ts",
  "public/.well-known/agents.json",
  "public/sitemap.xml",
]) {
  test(`${path} links to the standalone /spec route`, async () => {
    assert.match(await read(`../${path}`), /\/spec["<\n]/);
  });
}

test("sitemap also includes raw markdown", async () => {
  assert.match(await read("../public/sitemap.xml"), /\/spec\.md</);
});

test("agent discovery remains valid JSON", async () => {
  const agents = JSON.parse(await read("../public/.well-known/agents.json"));
  assert.equal(agents.trust.spec, "https://noui.bot/spec");
});
