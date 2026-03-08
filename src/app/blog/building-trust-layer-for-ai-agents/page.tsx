import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Building a Trust Layer for AI Agents — From Zero to Verified | noui.bot",
  description:
    "How we built provider verification, SLA tracking, dispute resolution, and composite trust scores for an AI agent marketplace. The trust primitives no one else is building.",
  keywords: [
    "AI agent trust",
    "MCP trust layer",
    "agent verification",
    "AI marketplace trust",
    "provider SLA",
    "dispute resolution",
    "agent bazaar trust",
  ],
  openGraph: {
    images: ["/og-image.jpg"],
    title: "Building a Trust Layer for AI Agents — From Zero to Verified",
    description:
      "Provider verification, SLA tracking, dispute resolution, and trust scores. The infrastructure piece everyone's ignoring.",
    type: "article",
    publishedTime: "2026-02-28T00:00:00Z",
  },
};

export default function TrustLayerBlog() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/blog"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; blog
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-16">
          <p className="font-mono text-xs text-white/30 mb-4">
            February 28, 2026 · 10 min read
          </p>
          <h1 className="font-mono text-2xl md:text-4xl font-bold text-white/90 leading-tight mb-6 break-words">
            Building a Trust Layer for AI Agents — From Zero to Verified
          </h1>
          <p className="font-mono text-base text-white/50 leading-relaxed">
            Every AI agent marketplace talks about discovery and billing. Nobody
            talks about trust. We built verification, SLA tracking, dispute
            resolution, and composite trust scores. Here&apos;s why — and how.
          </p>
        </header>

        <div className="space-y-8 font-mono text-sm text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              The Problem Nobody&apos;s Solving
            </h2>
            <p>
              Imagine you&apos;re an AI agent. Your human asks you to analyze a
              dataset. You find three MCP servers that claim to do statistical
              analysis. They all have pricing. They all have descriptions.
            </p>
            <p className="mt-4">Which one do you trust?</p>
            <p className="mt-4">
              Right now, the answer is: you can&apos;t know. There&apos;s no
              verification that the provider is who they claim. No track record
              of uptime. No dispute mechanism if they charge you and deliver
              garbage. No composite score that says &ldquo;this provider has been
              reliable for 30 days with 99.2% uptime and zero disputes.&rdquo;
            </p>
            <p className="mt-4">
              We looked at every MCP marketplace and billing layer in the space.{" "}
              <Link
                href="/docs/compare"
                className="text-white/90 underline underline-offset-4 hover:text-white"
              >
                Six competitors
              </Link>
              . None of them have trust infrastructure. Not xpay (live, but
              billing only). Not TollBit (not live yet). Not MCP Hive (launching
              March 8). None.
            </p>
            <p className="mt-4">
              This is the gap. And it&apos;s the gap that matters most.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              Why Trust Is the Moat
            </h2>
            <p>
              Billing is a commodity. Stripe handles the money movement. Any
              competent developer can build per-call metering. The hard part
              isn&apos;t &ldquo;how do agents pay&rdquo; — it&apos;s &ldquo;how do
              agents decide who to pay.&rdquo;
            </p>
            <p className="mt-4">
              In the human web, trust evolved over decades. SSL certificates.
              Verified badges. Star ratings. Escrow. Chargebacks. Return
              policies. BBB ratings. Every layer emerged because someone got
              burned.
            </p>
            <p className="mt-4">
              AI agents are about to hit every single one of these trust problems
              — compressed into months, not decades. The agent economy needs
              trust primitives <em>now</em>, built into the protocol layer, not
              bolted on after the first wave of scams.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              What We Built: Four Trust Primitives
            </h2>

            <h3 className="text-base font-bold text-white/70 mt-8 mb-3">
              1. Provider Verification
            </h3>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 my-4">
              <code className="font-mono text-xs text-white/60">
                POST /api/v1/bazaar/providers/verify
              </code>
            </div>
            <p>
              Three verification tiers: email verification (prove you own the
              email), domain verification (prove you own the domain via DNS TXT
              record), and code verification (prove you control the MCP server
              by responding to a challenge).
            </p>
            <p className="mt-4">
              Each tier adds to the provider&apos;s trust score. A provider with
              all three verified is fundamentally more trustworthy than an
              anonymous endpoint. This is the SSL certificate equivalent for the
              agent economy.
            </p>

            <h3 className="text-base font-bold text-white/70 mt-8 mb-3">
              2. SLA Metrics (30-Day Rolling)
            </h3>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 my-4">
              <code className="font-mono text-xs text-white/60">
                GET /api/v1/bazaar/providers/:id/sla
              </code>
            </div>
            <p>
              Real-time uptime percentage, p50/p95/p99 latency, error rates,
              total calls served — all computed over a rolling 30-day window.
              Agents don&apos;t have to guess whether a provider is reliable.
              They can check.
            </p>
            <p className="mt-4">
              This is the &ldquo;Yelp rating&rdquo; equivalent — except it&apos;s
              based on objective data, not subjective reviews. No gaming. No fake
              reviews. Just math.
            </p>

            <h3 className="text-base font-bold text-white/70 mt-8 mb-3">
              3. Dispute Resolution
            </h3>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 my-4">
              <code className="font-mono text-xs text-white/60">
                POST /api/v1/bazaar/disputes
              </code>
            </div>
            <p>
              If an agent pays for a tool call and gets garbage back, there needs
              to be recourse. Our dispute system lets consumers file disputes
              against specific receipts. Providers can respond. The system tracks
              resolution.
            </p>
            <p className="mt-4">
              This is the chargeback equivalent. Without it, the first time an
              agent gets scammed, every agent operator loses confidence in the
              entire ecosystem. Disputes are a trust <em>prerequisite</em>.
            </p>

            <h3 className="text-base font-bold text-white/70 mt-8 mb-3">
              4. Composite Trust Score
            </h3>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 my-4">
              <code className="font-mono text-xs text-white/60">
                GET /api/v1/bazaar/providers/:id/trust
              </code>
            </div>
            <p>
              All of the above feeds into a single composite trust score (0-100)
              with a badge tier: unverified, bronze, silver, gold. The algorithm
              weighs verification status, SLA performance, dispute history, and
              time on platform.
            </p>
            <p className="mt-4">
              An agent making a tool selection can now sort by trust score. A
              gold-tier provider with 99.5% uptime and zero disputes is a better
              bet than an unverified provider with no history — even if they&apos;re
              cheaper.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              The Technical Architecture
            </h2>
            <p>
              The trust layer sits between the billing layer and the discovery
              layer. When an agent queries the catalog, trust scores are attached
              to every provider. When a receipt is generated, SLA metrics update.
              When a dispute is filed, the trust score recalculates.
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 my-6 font-mono text-xs text-white/50">
              <pre>{`Discovery Layer (catalog, search)
        ↓
    Trust Layer ← verification + SLA + disputes
        ↓
   Billing Layer (meter, receipts, pricing)
        ↓
   Transport Layer (MCP proxy)`}</pre>
            </div>
            <p>
              Everything is API-first. Agents can programmatically check trust
              scores, verify providers, file disputes — no human UI required
              (though we built one too). The{" "}
              <Link
                href="/specs/mcp-billing-v1"
                className="text-white/90 underline underline-offset-4 hover:text-white"
              >
                MCP Billing Spec v1
              </Link>{" "}
              includes trust primitives as a core part of the standard, not an
              extension.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              What Happens Without Trust
            </h2>
            <p>
              Without trust infrastructure, here&apos;s what the agent economy
              looks like in 6 months:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-white/60">
              <li>
                Fly-by-night providers spin up MCP servers, collect payments,
                deliver nothing
              </li>
              <li>
                Agent operators lose money on unreliable tools, stop using
                marketplaces
              </li>
              <li>
                Legitimate providers get lumped in with scammers, leave for
                closed ecosystems
              </li>
              <li>
                The &ldquo;open MCP marketplace&rdquo; vision dies — replaced by
                walled gardens where only vetted partners get in
              </li>
            </ul>
            <p className="mt-4">
              This is exactly what happened with the early web. Open directories
              → spam → walled gardens (App Store). The agent economy doesn&apos;t
              have to repeat that cycle — if trust is built in from day one.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              The Competitive Landscape
            </h2>
            <p>
              We researched six competitors building in the MCP billing space.
              Here&apos;s the trust infrastructure comparison:
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 my-6 overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Platform</th>
                    <th className="text-center py-2 px-2">Verify</th>
                    <th className="text-center py-2 px-2">SLA</th>
                    <th className="text-center py-2 px-2">Disputes</th>
                    <th className="text-center py-2 px-2">Trust Score</th>
                  </tr>
                </thead>
                <tbody className="text-white/60">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white/80">
                      Agent Bazaar (us)
                    </td>
                    <td className="text-center py-2 px-2">✅</td>
                    <td className="text-center py-2 px-2">✅</td>
                    <td className="text-center py-2 px-2">✅</td>
                    <td className="text-center py-2 px-2">✅</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">xpay</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">TollBit</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">MCP Hive</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Nevermined</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The table speaks for itself. Trust isn&apos;t on anyone else&apos;s
              roadmap because they&apos;re still solving billing. We solved
              billing and moved to the next problem.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              What&apos;s Next
            </h2>
            <p>
              Trust Layer v0.4.0 is live. Next up:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-white/60">
              <li>
                <strong className="text-white/80">Reputation portability</strong>{" "}
                — Trust scores that follow providers across platforms (via signed
                attestations)
              </li>
              <li>
                <strong className="text-white/80">Automated dispute resolution</strong>{" "}
                — AI-powered analysis of disputed tool calls
              </li>
              <li>
                <strong className="text-white/80">Consumer trust scores</strong>{" "}
                — Providers should know who&apos;s calling them too
              </li>
              <li>
                <strong className="text-white/80">Trust-weighted routing</strong>{" "}
                — Agents automatically prefer higher-trust providers
              </li>
            </ul>
            <p className="mt-4">
              The{" "}
              <Link
                href="/specs/mcp-billing-v1"
                className="text-white/90 underline underline-offset-4 hover:text-white"
              >
                MCP Billing Spec
              </Link>{" "}
              is MIT-licensed and open. If you&apos;re building in the agent
              infrastructure space and want to adopt the trust primitives,{" "}
              <a
                href="https://github.com/TombStoneDash/mcp-billing-spec"
                className="text-white/90 underline underline-offset-4 hover:text-white"
              >
                the spec is on GitHub
              </a>
              .
            </p>
          </section>

          <section className="border-t border-white/10 pt-8 mt-12">
            <p className="text-white/40 text-xs">
              Agent Bazaar is the marketplace layer for{" "}
              <Link
                href="/"
                className="text-white/60 hover:text-white/80 underline underline-offset-4"
              >
                noui.bot
              </Link>
              . We&apos;re building the infrastructure that lets AI agents discover,
              pay for, and trust MCP tool servers.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
