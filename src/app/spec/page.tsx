import { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { markdownToHtml } from "@/lib/markdown";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "MCP Billing Spec v0.1 — noui.bot",
  description:
    "The implemented subset of MCP billing, metering, and signed receipts in noui.bot Agent Bazaar.",
};

export default function SpecPage() {
  const specPath = path.join(process.cwd(), "SPEC.md");
  const content = fs.readFileSync(specPath, "utf-8");
  const html = markdownToHtml(content);

  return (
    <main className="min-h-screen bg-black text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500">
          <Link href="/" className="hover:text-white">noui.bot</Link>
          {" → "}
          <Link href="/docs" className="hover:text-white">docs</Link>
          {" → "}
          <span className="text-gray-300">MCP Billing Spec v0.1</span>
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
            <a href="/spec.md" className="text-blue-400 hover:underline">
              raw markdown
            </a>{" "}
            |{" "}
            <Link href="/specs/mcp-billing-v1" className="text-blue-400 hover:underline">
              v1 draft
            </Link>{" "}
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
