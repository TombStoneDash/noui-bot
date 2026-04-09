import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Agent Bazaar vs Building Your Own: When to Use an MCP Marketplace | noui.bot",
  description:
    "Should you build your own MCP billing or use Agent Bazaar? A comparison of time, cost, features, and trade-offs for MCP tool monetization.",
  keywords: [
    "MCP marketplace",
    "Agent Bazaar",
    "MCP billing comparison",
    "build vs buy MCP",
    "MCP tool monetization",
    "MCP server billing",
  ],
  openGraph: {
    images: ["/og-image.jpg"],
    title: "Agent Bazaar vs Building Your Own: When to Use an MCP Marketplace",
    description:
      "Build or buy? A practical comparison for MCP tool monetization.",
    type: "article",
    publishedTime: "2026-04-08T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Bazaar vs Building Your Own: When to Use an MCP Marketplace",
    description:
      "Build or buy? A practical comparison for MCP tool monetization.",
  },
};

function ComparisonRow({
  feature,
  bazaar,
  diy,
}: {
  feature: string;
  bazaar: string;
  diy: string;
}) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-3 pr-4 font-mono text-xs text-white/60">{feature}</td>
      <td className="py-3 px-4 font-mono text-xs text-white/80">{bazaar}</td>
      <td className="py-3 pl-4 font-mono text-xs text-white/40">{diy}</td>
    </tr>
  );
}

export default function BazaarVsBuildPost() {
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
            April 8, 2026 &middot; 7 min read
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 break-words">
            Agent Bazaar vs Building Your Own: When to Use an MCP Marketplace
          </h1>
          <p className="text-lg text-white/50">
            You&apos;ve built an MCP server. Now you want to charge for it.
            Should you wire up Stripe yourself or use a marketplace? Here&apos;s
            the honest comparison.
          </p>
        </header>

        <div className="prose prose-invert prose-green max-w-none space-y-8 text-white/70 leading-relaxed">
          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            The Decision
          </h2>
          <p>
            Every MCP tool builder faces the same fork: build your own billing
            stack, or use an existing marketplace. The right answer depends on
            where you are, what you&apos;re optimizing for, and how much you
            value your time.
          </p>
          <p>
            This isn&apos;t a sales pitch disguised as a blog post. We&apos;ll
            cover the genuine trade-offs — including when building your own is
            the better call.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            The Comparison
          </h2>

          <div className="overflow-x-auto my-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left font-mono text-xs text-white/30 uppercase py-2 pr-4">
                    Feature
                  </th>
                  <th className="text-left font-mono text-xs text-emerald-400/60 uppercase py-2 px-4">
                    Agent Bazaar
                  </th>
                  <th className="text-left font-mono text-xs text-white/30 uppercase py-2 pl-4">
                    Build Your Own
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  feature="Time to launch"
                  bazaar="5 minutes"
                  diy="2-6 weeks"
                />
                <ComparisonRow
                  feature="Stripe integration"
                  bazaar="Included (Connect)"
                  diy="3-5 days minimum"
                />
                <ComparisonRow
                  feature="Sub-cent metering"
                  bazaar="Built-in"
                  diy="Custom implementation"
                />
                <ComparisonRow
                  feature="Rate limiting"
                  bazaar="Per-consumer, configurable"
                  diy="DIY or third-party"
                />
                <ComparisonRow
                  feature="Discovery"
                  bazaar="Listed in marketplace"
                  diy="Market yourself"
                />
                <ComparisonRow
                  feature="Trust layer"
                  bazaar="Verification, receipts, SLA"
                  diy="Build from scratch"
                />
                <ComparisonRow
                  feature="Disputes"
                  bazaar="Full workflow"
                  diy="Support tickets"
                />
                <ComparisonRow
                  feature="Revenue share"
                  bazaar="You keep 90%"
                  diy="You keep 97% (Stripe fees)"
                />
                <ComparisonRow
                  feature="Vendor lock-in"
                  bazaar="Open spec (MIT)"
                  diy="Your code, your rules"
                />
                <ComparisonRow
                  feature="Maintenance"
                  bazaar="We handle it"
                  diy="Your burden"
                />
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            When to Use Agent Bazaar
          </h2>
          <ul className="list-disc list-inside space-y-3 text-white/60">
            <li>
              <strong className="text-white/80">
                You want to ship in a day, not a month.
              </strong>{" "}
              Register, set pricing, done. Your MCP server doesn&apos;t change.
            </li>
            <li>
              <strong className="text-white/80">
                You want discovery.
              </strong>{" "}
              Being listed where agent developers browse is worth more than the
              10% fee for most early-stage tools.
            </li>
            <li>
              <strong className="text-white/80">
                You don&apos;t want to build trust infrastructure.
              </strong>{" "}
              Signed receipts, SLA tracking, dispute resolution — this is months
              of work to build right.
            </li>
            <li>
              <strong className="text-white/80">
                Your pricing is per-call.
              </strong>{" "}
              The Bazaar model works perfectly for per-call and per-token
              pricing. Flat-rate SaaS is a different product.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            When to Build Your Own
          </h2>
          <ul className="list-disc list-inside space-y-3 text-white/60">
            <li>
              <strong className="text-white/80">
                You&apos;re processing 100K+ calls/day.
              </strong>{" "}
              At high volume, the 10% fee adds up. If your tool is already
              established, building a billing layer may be cheaper long-term.
            </li>
            <li>
              <strong className="text-white/80">
                You need custom pricing logic.
              </strong>{" "}
              Tiered enterprise contracts, usage-based pricing with minimums,
              annual commitments — these need custom billing.
            </li>
            <li>
              <strong className="text-white/80">
                You&apos;re building a platform, not a tool.
              </strong>{" "}
              If you&apos;re building your own marketplace with multiple
              providers, you might want the billing spec without the marketplace.
            </li>
            <li>
              <strong className="text-white/80">
                You&apos;re in a regulated industry.
              </strong>{" "}
              Healthcare, finance — if compliance requires you to own every
              component, build it in-house.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            The Hybrid Approach
          </h2>
          <p>
            Many builders start with Agent Bazaar for discovery and validation,
            then migrate high-volume customers to direct billing. This works
            because the billing spec is open — there&apos;s no lock-in.
          </p>
          <p>
            Think of it like launching on Product Hunt: you use the platform for
            distribution, then build direct relationships over time.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            The Real Cost of Building Your Own
          </h2>
          <p>
            Before you decide to build, here&apos;s what &ldquo;roll your
            own&rdquo; actually entails:
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 my-6">
            <h3 className="font-mono text-sm text-white/80 mb-4">
              DIY Billing Stack
            </h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>Stripe integration (Checkout, Webhooks, Connect) — 3-5 days</li>
              <li>Usage metering with sub-cent precision — 2-3 days</li>
              <li>Rate limiting per consumer — 1-2 days</li>
              <li>API key management — 1-2 days</li>
              <li>Usage dashboard — 3-5 days</li>
              <li>Receipt generation and storage — 2-3 days</li>
              <li>Dispute handling workflow — 3-5 days</li>
              <li>SLA monitoring — 2-3 days</li>
              <li>Testing, edge cases, security — 3-5 days</li>
            </ul>
            <p className="font-mono text-xs text-white/40 mt-4 pt-4 border-t border-white/10">
              Total: 20-33 engineering days. At $200/hr, that&apos;s
              $32,000-$52,800.
            </p>
          </div>

          <p>
            Versus: register on Agent Bazaar, set pricing, and start earning in
            the time it takes to drink a coffee. The 10% fee needs to exceed
            $3,200/month before building your own breaks even — and that&apos;s
            assuming your engineering time has no opportunity cost.
          </p>

          <h2 className="text-xl font-bold text-white mt-12 mb-4">
            Bottom Line
          </h2>
          <p>
            If you&apos;re an MCP tool builder who wants to monetize today,
            Agent Bazaar gets you there in minutes. If you&apos;re a platform
            processing millions of calls, build on the open spec. Either way,
            the billing standard is MIT licensed — your choice is never
            permanent.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 my-8">
            <h3 className="font-mono text-sm text-white/80 mb-3">
              Ready to try it?
            </h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link
                  href="/providers/register"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Register as a provider
                </Link>{" "}
                — 5 minutes, no code changes
              </li>
              <li>
                <Link
                  href="/docs/compare"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Full competitive comparison
                </Link>{" "}
                — Bazaar vs MCPize vs xpay vs TollBit
              </li>
              <li>
                <Link
                  href="/specs/mcp-billing-v1"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  The open billing spec
                </Link>{" "}
                — build on it yourself (MIT)
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
