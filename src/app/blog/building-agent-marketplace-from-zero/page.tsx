import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Building an Agent Tool Marketplace from Zero — Lessons from Week 1 | noui.bot",
  description:
    "We built Agent Bazaar in 5 days. Here's what we learned about billing, trust, and the economics of AI agent tools.",
  openGraph: {
    images: ["/og-image.jpg"],
    title: "Building an Agent Tool Marketplace from Zero",
    description: "We built Agent Bazaar in 5 days. Here's what we learned.",
    url: "https://noui.bot/blog/building-agent-marketplace-from-zero",
  },
};

export default function BlogPost() {
  return (
    <article className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl">
      <a
        href="/blog"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        ← blog
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-3 leading-tight break-words">
        Building an Agent Tool Marketplace from Zero — Lessons from Week 1
      </h1>
      <div className="flex items-center gap-4 text-xs text-white/30 font-mono mb-12">
        <span>2026-02-28</span>
        <span>·</span>
        <span>8 min read</span>
        <span>·</span>
        <span>Hudson Taylor</span>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/60 leading-relaxed">
        <p className="text-white/80 text-base">
          Five days ago, Agent Bazaar was a database schema and a proxy route. Today it&apos;s a
          marketplace with 35 API endpoints, a public catalog, provider dashboards, consumer
          registration, signed receipts, dispute resolution, and an{" "}
          <a href="/specs/mcp-billing-v1" className="text-white/80 underline underline-offset-4 hover:text-white">
            open billing spec
          </a>
          . Here&apos;s what I learned building it.
        </p>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          The thesis: MCP servers can&apos;t make money
        </h2>
        <p>
          The Model Context Protocol is exploding. Thousands of MCP servers exist — weather APIs,
          code execution sandboxes, database connectors, web scrapers. But almost none of them
          generate revenue. The developers who built them have no way to get paid per-call.
        </p>
        <p>
          Stripe doesn&apos;t handle sub-cent transactions. Building your own billing layer is a
          2-4 week project minimum. Most MCP developers are solo builders who&apos;d rather write
          code than implement metering infrastructure.
        </p>
        <p>
          So we built it for them.
        </p>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          Lesson 1: The proxy is the product
        </h2>
        <p>
          The core of Agent Bazaar is a billing proxy. An AI agent calls our endpoint, we authenticate
          the request, check the consumer&apos;s balance, proxy the call to the provider&apos;s MCP
          server, meter the response, deduct the cost, and return the result. One HTTP call from the
          agent&apos;s perspective.
        </p>
        <p>
          This is deceptively simple in concept and surprisingly complex in practice. You need:
          rate limiting per consumer, balance checking with race condition handling, timeout management,
          retry logic, error categorization, latency tracking, and receipt generation — all in the
          hot path of every single tool call.
        </p>
        <p>
          Our proxy route is 305 lines of TypeScript. Every line matters.
        </p>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          Lesson 2: Trust is a feature, not a nice-to-have
        </h2>
        <p>
          AI agents make autonomous decisions about spending money. An agent calling a tool at
          $0.01/call sounds cheap until it&apos;s making 10,000 calls per day. That&apos;s $100/day
          with no human in the loop.
        </p>
        <p>
          We built the Trust Layer because agents need cryptographic proof of what happened.
          Every tool call gets an HMAC-SHA256 signed receipt — the tool called, the input hash,
          the output hash, the cost, the latency. If something goes wrong, you can file a dispute
          against a specific receipt. If a provider&apos;s uptime drops below their SLA, it shows
          up in their trust score.
        </p>
        <p>
          No other MCP billing solution has this. It&apos;s our moat.
        </p>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          Lesson 3: Open spec → defensible position
        </h2>
        <p>
          Counterintuitively, publishing our{" "}
          <a href="/specs/mcp-billing-v1" className="text-white/80 underline underline-offset-4 hover:text-white">
            billing spec as MIT-licensed open source
          </a>{" "}
          makes our position stronger, not weaker. Here&apos;s why:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Providers adopt the spec because there&apos;s no lock-in risk</li>
          <li>If others implement the spec, the ecosystem grows and we benefit from network effects</li>
          <li>We&apos;re the reference implementation — first-mover advantage with a head start on features</li>
          <li>Competing with an open standard is harder than competing with a proprietary API</li>
        </ul>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          Lesson 4: The 18% number
        </h2>
        <p>
          We charge 18% on paid tool calls. Here&apos;s how we arrived at that:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Apple/Google app stores: 30% (too high for API-first)</li>
          <li>Stripe Marketplace: 25-30% effective rate</li>
          <li>Shopify: ~2.9% + $0.30 per transaction (works for high-value, not sub-cent)</li>
          <li>Gumroad: 10% (no metering, no real-time billing)</li>
        </ul>
        <p>
          18% gives providers 82% of revenue while covering Stripe processing fees (~2.9%),
          infrastructure costs, and leaving margin for the platform. It&apos;s low enough that
          providers prefer us over building their own billing, and high enough to sustain the
          business.
        </p>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          Lesson 5: Ship the marketplace before you have sellers
        </h2>
        <p>
          Classic chicken-and-egg. You need providers to attract consumers, and consumers to
          attract providers. We solved this by:
        </p>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>Building our own demo providers (BotWall3t, Deploy Rail) to seed the catalog</li>
          <li>Making the marketplace browsable even with seed data — it looks real because it is real</li>
          <li>
            Opening provider registration first — MCP developers can list their servers today and
            be ready when consumers arrive
          </li>
          <li>Reaching out directly to high-star MCP server maintainers on GitHub</li>
        </ol>

        <h2 className="font-mono text-lg font-bold text-white mt-12 mb-4">
          What&apos;s next
        </h2>
        <p>
          We&apos;re 5 days in. The architecture is solid, the billing math works, the trust layer
          is live. Now we need:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Real providers listing real tools with real pricing</li>
          <li>Stripe Connect payouts (scaffold exists, needs production testing)</li>
          <li>TypeScript SDK published to npm</li>
          <li>Volume discounts for high-traffic providers</li>
          <li>Webhook notifications for usage alerts</li>
        </ul>
        <p>
          If you maintain an MCP server and want to monetize it,{" "}
          <a href="/providers/register" className="text-white/80 underline underline-offset-4 hover:text-white">
            register as a provider
          </a>
          . Setup takes 5 minutes. The billing spec is{" "}
          <a href="https://github.com/TombStoneDash/mcp-billing-spec" className="text-white/80 underline underline-offset-4 hover:text-white">
            open source
          </a>
          .
        </p>
        <p>
          We&apos;re building this in the open because the MCP ecosystem deserves transparent
          infrastructure, not walled gardens.
        </p>

        {/* Links */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <h3 className="font-mono text-sm font-bold text-white mb-4">Links</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/marketplace" className="text-white/60 hover:text-white transition-colors">
                → Browse the Marketplace
              </a>
            </li>
            <li>
              <a href="/docs/quickstart" className="text-white/60 hover:text-white transition-colors">
                → Quickstart Guide (5 minutes)
              </a>
            </li>
            <li>
              <a href="/pricing" className="text-white/60 hover:text-white transition-colors">
                → Pricing & Revenue Calculator
              </a>
            </li>
            <li>
              <a href="/specs/mcp-billing-v1" className="text-white/60 hover:text-white transition-colors">
                → MCP Billing Spec v1 (MIT)
              </a>
            </li>
            <li>
              <a href="https://github.com/TombStoneDash/mcp-billing-spec" className="text-white/60 hover:text-white transition-colors">
                → GitHub: mcp-billing-spec
              </a>
            </li>
          </ul>
        </div>
      </div>
    </article>
  );
}
