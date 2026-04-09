import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "MCP Billing: The Missing Infrastructure for AI Agent Marketplaces | noui.bot",
  description:
    "10,000+ MCP servers have no way to charge for their tools. MCP billing is the missing layer that turns open-source tools into sustainable businesses. Here's why it matters and how the ecosystem is solving it.",
  keywords: [
    "MCP billing",
    "MCP server monetization",
    "AI agent marketplace",
    "Model Context Protocol billing",
    "MCP metering",
    "agent tool payments",
    "MCP infrastructure",
  ],
  openGraph: {
    images: ["/og-image.jpg"],
    title: "MCP Billing: The Missing Infrastructure for AI Agent Marketplaces",
    description:
      "10,000+ MCP servers can't charge for their tools. MCP billing is the missing infrastructure layer.",
    type: "article",
    publishedTime: "2026-04-08T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Billing: The Missing Infrastructure for AI Agent Marketplaces",
    description:
      "10,000+ MCP servers can't charge for their tools. MCP billing is the missing infrastructure layer.",
  },
};

export default function MCPBillingInfrastructurePost() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/blog"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Blog
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-12">
          <div className="font-mono text-xs text-white/30 mb-4">
            April 8, 2026 &middot; 8 min read
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 break-words">
            MCP Billing: The Missing Infrastructure for AI Agent Marketplaces
          </h1>
          <p className="text-lg text-white/50">
            The Model Context Protocol gave agents a universal way to use tools.
            But it left out the most important part: how tool builders get paid.
          </p>
        </header>

        <div className="prose prose-invert prose-green max-w-none space-y-8 text-white/70 leading-relaxed">
          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            The MCP Explosion
          </h2>
          <p>
            Since Anthropic open-sourced MCP in late 2024, the ecosystem has
            exploded. Over 10,000 MCP servers now exist, covering everything from
            web search to database queries to code execution. Every major AI
            platform supports MCP: Claude, GPT, Gemini, Llama-based agents.
          </p>
          <p>
            But there&apos;s a problem hiding in plain sight. Of those 10,000+
            servers, virtually none have a billing layer. Tool builders give
            their work away for free — or don&apos;t build the tool at all.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            Why Billing Matters More Than You Think
          </h2>
          <p>
            The conventional wisdom is that billing is a &ldquo;nice to have&rdquo; —
            something you add after you have traction. In the MCP ecosystem,
            that&apos;s backwards. Billing is the bottleneck that prevents
            traction from happening.
          </p>
          <p>Here&apos;s the dynamic:</p>
          <ul className="list-disc list-inside space-y-2 text-white/60">
            <li>
              <strong className="text-white/80">Tool builders</strong> want to
              monetize but don&apos;t want to build Stripe integrations, usage
              tracking, rate limiting, and dispute handling from scratch.
            </li>
            <li>
              <strong className="text-white/80">Agent developers</strong> want
              to use premium tools but need a single API key, not 50 separate
              subscriptions.
            </li>
            <li>
              <strong className="text-white/80">Platforms</strong> want to embed
              tool marketplaces but need billing infrastructure they don&apos;t
              have to build.
            </li>
          </ul>
          <p>
            Without billing infrastructure, the MCP ecosystem stays in the
            &ldquo;hobby project&rdquo; phase. With it, tool building becomes a
            sustainable business.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            What MCP Billing Actually Requires
          </h2>
          <p>
            Billing for MCP tools isn&apos;t the same as billing for a SaaS app.
            Agent-to-agent transactions have unique requirements:
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 my-6">
            <h3 className="font-mono text-sm text-white/80 mb-4">
              The 7 Primitives of MCP Billing
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-sm text-white/60">
              <li>
                <strong className="text-white/80">Sub-cent metering</strong> —
                Tool calls cost $0.001 to $0.25. You need fractional-cent
                precision.
              </li>
              <li>
                <strong className="text-white/80">Exactly-once billing</strong>{" "}
                — Agents retry on timeout. A billing proxy must deduplicate.
              </li>
              <li>
                <strong className="text-white/80">Signed receipts</strong> —
                Both parties need cryptographic proof of what was called, what it
                cost, and what was returned.
              </li>
              <li>
                <strong className="text-white/80">Dispute resolution</strong> —
                When a tool returns garbage, who arbitrates? You need a formal
                dispute workflow.
              </li>
              <li>
                <strong className="text-white/80">Provider verification</strong>{" "}
                — Identity, domain ownership, code review. Not all providers are
                equally trustworthy.
              </li>
              <li>
                <strong className="text-white/80">SLA enforcement</strong> —
                Uptime tracking, latency monitoring, automatic deactivation on
                repeated failures.
              </li>
              <li>
                <strong className="text-white/80">Discovery</strong> — Agents
                need to programmatically find, evaluate, and compare tools.
              </li>
            </ol>
          </div>

          <p>
            Most billing solutions handle #1 and maybe #2. The rest — the trust
            layer — is what separates infrastructure from a payment form.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            The Open MCP Billing Standard
          </h2>
          <p>
            We&apos;ve published an{" "}
            <Link
              href="/specs/mcp-billing-v1"
              className="text-emerald-400 hover:text-emerald-300"
            >
              open billing specification
            </Link>{" "}
            (MIT licensed) that covers all seven primitives. It defines schemas
            for meter events, receipts, pricing declarations, verification
            levels, disputes, and trust scores.
          </p>
          <p>
            The spec is deliberately minimalist: JSON schemas that any HTTP
            server can implement. No SDK required. No vendor lock-in. If you
            outgrow any particular implementation, take the spec and build your
            own.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            Agent Bazaar: The Reference Implementation
          </h2>
          <p>
            <Link
              href="/marketplace"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Agent Bazaar
            </Link>{" "}
            is our implementation of this spec. It&apos;s a billing proxy that
            sits between agents and MCP servers. Providers register their tools,
            set pricing, and start earning. Consumers get one API key that works
            across all providers.
          </p>
          <p>
            The numbers so far: 14 tools from 6 providers, $0.30 in tracked
            revenue. Small — but the infrastructure is live and the spec is
            proven.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            What Comes Next
          </h2>
          <p>
            MCP billing will be as fundamental to the agent ecosystem as payment
            processing is to e-commerce. The question isn&apos;t whether it will
            exist — it&apos;s who builds the standard and whether it&apos;s open
            or proprietary.
          </p>
          <p>
            We&apos;re betting on open. The spec is MIT. The SDK is published.
            The marketplace is live. If you&apos;re building MCP tools and want
            to monetize, the infrastructure is here.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 my-8">
            <h3 className="font-mono text-sm text-white/80 mb-3">
              Get started
            </h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link
                  href="/providers/register"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Register as a provider
                </Link>{" "}
                — list your tools in 5 minutes
              </li>
              <li>
                <Link
                  href="/get-started"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Developer quick start
                </Link>{" "}
                — make your first metered call
              </li>
              <li>
                <Link
                  href="/specs/mcp-billing-v1"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Read the spec
                </Link>{" "}
                — the full MCP billing standard
              </li>
            </ul>
          </div>
        </div>
      </article>

      <footer className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/5">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </main>
  );
}
