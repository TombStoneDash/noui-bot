import { Metadata } from "next";
import fs from "fs";
import path from "path";

export const metadata: Metadata = {
  title: "MCP Billing Spec v1 — noui.bot",
  description:
    "Open standard for billing, metering, receipts, verification, and dispute resolution in MCP tool ecosystems.",
};

export default function SpecPage() {
  // Read the markdown file at build time
  const specPath = path.join(process.cwd(), "public", "specs", "mcp-billing-v1.md");
  let content = "";
  try {
    content = fs.readFileSync(specPath, "utf-8");
  } catch {
    content = "# Spec not found\n\nThe MCP Billing Spec v1 document is being prepared.";
  }

  // Simple markdown-to-HTML conversion for the spec
  const html = markdownToHtml(content);

  return (
    <main className="min-h-screen bg-black text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500">
          <a href="/" className="hover:text-white">noui.bot</a>
          {" → "}
          <a href="/docs" className="hover:text-white">docs</a>
          {" → "}
          <span className="text-gray-300">MCP Billing Spec v1</span>
        </nav>
        <article
          className="prose prose-invert prose-lg max-w-none 
            prose-headings:text-white prose-a:text-blue-400 
            prose-code:text-green-400 prose-code:bg-gray-900 prose-code:px-1 prose-code:rounded
            prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800
            prose-table:border-collapse prose-th:border prose-th:border-gray-700 prose-th:px-4 prose-th:py-2
            prose-td:border prose-td:border-gray-800 prose-td:px-4 prose-td:py-2
            prose-strong:text-white"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <footer className="mt-16 pt-8 border-t border-gray-800 text-sm text-gray-500">
          <p>
            This spec is MIT licensed. Copy it. Fork it. Implement it. That&apos;s the point.
          </p>
          <p className="mt-2">
            Reference implementation:{" "}
            <a href="https://noui.bot/api/v1" className="text-blue-400 hover:underline">
              noui.bot Agent Bazaar
            </a>{" "}
            |{" "}
            <a
              href="https://github.com/TombStoneDash/noui-bot"
              className="text-blue-400 hover:underline"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre><code class="language-${lang || "text"}">${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split("|").filter(Boolean).map((c) => c.trim());
    if (cells.every((c) => /^[-:]+$/.test(c))) {
      return ""; // separator row
    }
    const tag = "td";
    return "<tr>" + cells.map((c) => `<${tag}>${c}</${tag}>`).join("") + "</tr>";
  });

  // Wrap table rows in table tags (simple heuristic)
  html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => {
    // Convert first row to th
    const firstRow = match.replace(/<tr>(.*?)<\/tr>/, (_, inner) => {
      return "<thead><tr>" + inner.replace(/<td>/g, "<th>").replace(/<\/td>/g, "</th>") + "</tr></thead>";
    });
    return "<table>" + firstRow + "</table>";
  });

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Paragraphs (lines not already wrapped)
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (
        !trimmed ||
        trimmed.startsWith("<") ||
        trimmed.startsWith("#")
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n\n");

  return html;
}
