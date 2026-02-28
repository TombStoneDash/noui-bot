"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const posts = [
  {
    slug: "building-trust-layer-for-ai-agents",
    title: "Building a Trust Layer for AI Agents — From Zero to Verified",
    date: "February 28, 2026",
    excerpt:
      "How we built provider verification, SLA tracking, dispute resolution, and composite trust scores. A deep technical walkthrough of the trust primitives no one else is building.",
    readTime: "10 min read",
  },
  {
    slug: "how-to-monetize-your-mcp-server",
    title: "How to Monetize Your MCP Server in 5 Minutes",
    date: "February 28, 2026",
    excerpt:
      "Step-by-step tutorial: install the SDK, wrap your existing MCP server with billing middleware, set per-call or per-token pricing, and start earning from AI agent traffic. Copy-paste code included.",
    readTime: "5 min read",
  },
  {
    slug: "why-every-ai-agent-needs-a-trust-layer",
    title: "Why Every AI Agent Needs a Trust Layer",
    date: "February 28, 2026",
    excerpt:
      "10,000+ MCP servers with zero trust standards. Identity spoofing, prompt injection via tool responses, and zero accountability. Here's what a real trust layer looks like — and why NIST agrees it's urgent.",
    readTime: "7 min read",
  },
  {
    slug: "mcp-billing-landscape-6-approaches",
    title:
      "The MCP Billing Landscape — 6 Approaches Compared",
    date: "February 27, 2026",
    excerpt:
      "There are 10,000+ MCP servers. Most are hobby-quality because developers can't earn from them. Six companies are trying to fix this. Here's how they compare — and what none of them have built yet.",
    readTime: "8 min read",
  },
  {
    slug: "mcp-billing-standard-explained",
    title:
      "The Open MCP Billing Standard — How AI Agents Pay for Tools",
    date: "June 13, 2026",
    excerpt:
      "A deep dive into the open MCP billing standard: meter events, receipts, pricing schemas, and trust scores — the primitives that give every MCP server a real business model.",
    readTime: "9 min read",
  },
  {
    slug: "why-mcp-servers-need-billing",
    title: "Why MCP Servers Need a Billing Layer",
    date: "February 23, 2026",
    excerpt:
      "MCP is the fastest-growing protocol in AI, but it has no monetization standard. Builders can't charge for their tools. Agents can't discover and pay for tools programmatically. Here's why Agent Bazaar exists.",
    readTime: "6 min read",
  },
  {
    slug: "the-last-5-percent-problem",
    title: "The Last 5% Problem — Why AI Agents Need Humans",
    date: "February 23, 2026",
    excerpt:
      "AI agents can autonomously complete 80-95% of tasks. But the last 5-20% hits real walls: CAPTCHAs, phone calls, niche UIs, identity verification. What if agents could just... hire a human?",
    readTime: "7 min read",
  },
];

export default function BlogIndex() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; noui.bot
        </Link>
      </nav>

      <section className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-mono text-4xl font-bold tracking-tight mb-4">
            Blog
          </h1>
          <p className="text-white/50 mb-16">
            Thoughts on agent infrastructure, MCP, and the future of autonomous AI.
          </p>

          <div className="space-y-12">
            {posts.map((post, i) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
              >
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-white/30">
                      {post.date}
                    </span>
                    <span className="font-mono text-xs text-white/20">
                      &middot; {post.readTime}
                    </span>
                  </div>
                  <h2 className="font-mono text-xl text-white/90 group-hover:text-white transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-white/40 leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/5">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </main>
  );
}
