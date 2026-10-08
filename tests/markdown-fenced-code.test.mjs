import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "../src/lib/markdown.ts";

test("fenced Markdown stays literal through every formatting pass", () => {
  const code = [
    "plain text",
    "# literal",
    "## literal",
    "### literal",
    "#### literal",
    "##### literal",
    "###### literal",
    "**bold** *italic* ***both***",
    "[link](/local)",
    "`inline` and ``backticks``",
    "| heading | heading |",
    "| --- | :---: |",
    "| value | value |",
    "---",
    "- unordered",
    "1. ordered",
    "",
  ].join("\n");
  assert.equal(
    markdownToHtml(`\`\`\`text\n${code}\`\`\``),
    `<pre><code class="language-text">${code}</code></pre>`,
  );
});

test("fences preserve blank lines, indentation, tabs, and trailing spaces", () => {
  const code = "\n\n  indented  \n\twith tab\n\nlast  \n\n";
  assert.equal(
    markdownToHtml(`\`\`\`\n${code}\`\`\``),
    `<pre><code class="language-text">${code}</code></pre>`,
  );
});

test("multiple fences preserve their languages and surrounding Markdown", () => {
  const md = "# Outside\n\n```js\n`literal`\n```\n\n**Between**\n\n```\n# literal\n```\n\nAfter";
  assert.equal(
    markdownToHtml(md),
    '<h1>Outside</h1>\n\n<pre><code class="language-js">`literal`\n</code></pre>\n\n<strong>Between</strong>\n\n<pre><code class="language-text"># literal\n</code></pre>\n\n<p>After</p>',
  );
});

test("fences escape ampersands and angle brackets exactly once", () => {
  assert.equal(
    markdownToHtml('```html\n<div title="x">& &amp;</div>\n```'),
    '<pre><code class="language-html">&lt;div title="x"&gt;&amp; &amp;amp;&lt;/div&gt;\n</code></pre>',
  );
});

test("placeholder-looking source cannot collide with fenced blocks", () => {
  const literal = "<!--FENCEDCODE0-->\n<!--FENCEDCODEX0-->";
  assert.equal(
    markdownToHtml(`${literal}\n\n\`\`\`text\n${literal}\n\`\`\``),
    `${literal}\n\n<pre><code class="language-text">&lt;!--FENCEDCODE0--&gt;\n&lt;!--FENCEDCODEX0--&gt;\n</code></pre>`,
  );
});

test("ordinary Markdown outside fences keeps existing formatting", () => {
  assert.equal(
    markdownToHtml("## Heading\n\nText **bold**, *italic*, ***both***, `code`, [link](/local).\n\n---\n\n| A | B |\n| --- | --- |\n| C | D |"),
    '<h2>Heading</h2>\n\n<p>Text <strong>bold</strong>, <em>italic</em>, <strong><em>both</em></strong>, <code>code</code>, <a href="/local">link</a>.</p>\n\n<hr />\n\n<table><thead><tr><th>A</th><th>B</th></tr></thead>\n</table>\n<table><thead><tr><th>C</th><th>D</th></tr></thead></table>',
  );
});
