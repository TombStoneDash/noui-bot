import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "The Open MCP Billing Standard — How AI Agents Pay for Tools | noui.bot",
  description:
    "A deep dive into the open MCP billing standard: how AI agent payments work, why open standards beat proprietary solutions, and how meter events, receipts, and trust scores create a real economy for AI tools.",
  keywords: [
    "MCP billing standard",
    "AI agent payments",
    "MCP server monetization",
    "agent tool billing",
    "Model Context Protocol billing",
    "AI agent economy",
    "MCP metering",
  ],
  openGraph: {
    title: "The Open MCP Billing Standard — How AI Agents Pay for Tools",
    description:
      "Meter events, receipts, pricing schemas, and trust scores — the open spec that gives MCP tools a real business model.",
    type: "article",
    publishedTime: "2026-06-13T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Open MCP Billing Standard — How AI Agents Pay for Tools",
    description:
      "Meter events, receipts, pricing schemas, and trust scores — the open spec that gives MCP tools a real business model.",
  },
};

export default function MCPBillingStandardPost() {
  return (
    <main className="min-h-screen bg-black text-white">
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
            June 13, 2026 &middot; 9 min read
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            The Open MCP Billing Standard — How AI Agents Pay for Tools
          </h1>
          <p className="text-lg text-white/50">
            MCP servers have no monetization path. The open MCP billing standard
            fixes this with meter events, receipts, pricing schemas, and trust
            scores — turning AI agent payments into a solved problem.
          </p>
        </header>

        <div className="prose-invert space-y-6 text-white/70 leading-relaxed">
          {/* ───── Section 1: The Problem ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            The Problem: MCP Tools Can&apos;t Charge for Anything
          </h2>
          <p>
            Anthropic&apos;s Model Context Protocol has become the standard way AI
            agents interact with external tools. Thousands of MCP servers exist —
            code analysis, data retrieval, web scraping, image generation — and
            the ecosystem is growing exponentially.
          </p>
          <p>
            But here&apos;s the uncomfortable truth: almost none of them make money.
          </p>
          <p>
            The MCP spec defines how agents <em>call</em> tools. It says nothing
            about how agents <em>pay</em> for tools. Every builder who wants to
            charge has to invent their own auth, metering, invoicing, and payment
            flow from scratch. Most don&apos;t bother. They open-source it, run it at a
            loss, or just don&apos;t build it.
          </p>
          <p>
            This is the AI equivalent of the pre-Stripe web. You could build a
            store, but accepting payments required a merchant account, a payment
            gateway, PCI compliance, and weeks of integration work. The result?
            Fewer stores got built.
          </p>
          <p>
            The same thing is happening with MCP. Without a billing standard, the
            tools that should exist — the expensive-to-run, high-value tools —
            don&apos;t get built because there&apos;s no business model.
          </p>

          {/* ───── Section 2: What the Billing Spec Solves ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            What the MCP Billing Standard Actually Does
          </h2>
          <p>
            The{" "}
            <a
              href="https://github.com/TombStoneDash/mcp-billing-spec"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              open MCP billing spec
            </a>{" "}
            (published by Agent Bazaar) defines four primitives that, together,
            give every MCP server a complete monetization layer:
          </p>

          <ul className="list-none space-y-5 pl-0">
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">01.</span>
              <span>
                <strong className="text-white/80">Pricing Schemas.</strong>{" "}
                Providers declare their pricing in a machine-readable format
                right in the MCP tool manifest. Per-call flat fees, per-token
                metering, tiered volume pricing, free tiers — all expressible in
                a single JSON object. Agents can compare prices across providers
                before making a single call.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">02.</span>
              <span>
                <strong className="text-white/80">Meter Events.</strong> Every
                billable action emits a structured meter event — a timestamped
                record of what was consumed (tokens, API calls, compute seconds).
                These events are the source of truth for billing. They&apos;re
                append-only, tamper-evident, and auditable by both parties.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">03.</span>
              <span>
                <strong className="text-white/80">Receipts.</strong> After each
                tool call, the provider returns a cryptographically signed
                receipt. The receipt references the meter events, the total cost,
                and a hash that proves the response matches what was billed for.
                Agents can verify receipts locally — no trusted third party
                required.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">04.</span>
              <span>
                <strong className="text-white/80">Trust Scores.</strong> The
                spec includes a trust and reputation layer. Providers accumulate
                scores based on uptime, response accuracy, billing honesty, and
                dispute outcomes. Agents can filter tool discovery by minimum
                trust threshold — &ldquo;only show me providers with 95%+
                reliability.&rdquo;
              </span>
            </li>
          </ul>

          <p>
            Together, these four primitives turn &ldquo;I built an MCP server&rdquo;
            into &ldquo;I have a business.&rdquo;
          </p>

          {/* ───── Section 3: Stripe Comparison ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            Think of It as Stripe for MCP
          </h2>
          <p>
            The analogy is direct. Before Stripe, every web merchant needed
            custom payment infrastructure. Stripe standardized it: a universal
            API, transparent pricing, built-in fraud detection, and instant
            payouts.
          </p>
          <p>
            The MCP billing standard does the same thing for AI agent payments:
          </p>

          <div className="overflow-x-auto my-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-6 text-white/50 font-mono font-normal">
                    Concern
                  </th>
                  <th className="text-left py-3 pr-6 text-white/50 font-mono font-normal">
                    Stripe (Web)
                  </th>
                  <th className="text-left py-3 text-white/50 font-mono font-normal">
                    MCP Billing (Agents)
                  </th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-6">Pricing</td>
                  <td className="py-3 pr-6">Product catalog</td>
                  <td className="py-3">Pricing schemas in tool manifest</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-6">Usage tracking</td>
                  <td className="py-3 pr-6">Stripe Billing meters</td>
                  <td className="py-3">Meter events</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-6">Proof of payment</td>
                  <td className="py-3 pr-6">Receipts &amp; invoices</td>
                  <td className="py-3">Signed receipts with hash verification</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-6">Trust</td>
                  <td className="py-3 pr-6">Radar fraud scores</td>
                  <td className="py-3">Provider trust scores &amp; SLA metrics</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6">Disputes</td>
                  <td className="py-3 pr-6">Chargebacks</td>
                  <td className="py-3">On-chain dispute resolution</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            The key difference: Stripe is a company. The MCP billing standard is
            an <em>open specification</em>. Anyone can implement it. No vendor
            lock-in, no platform fees baked into the protocol itself.
          </p>

          {/* ───── Section 4: Open vs Proprietary ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            Why Open Standards Beat Proprietary Solutions
          </h2>
          <p>
            The MCP billing space isn&apos;t empty. Several projects have taken a
            proprietary approach — xpay and MCP Hive among them. They offer
            billing dashboards, hosted metering, and managed payment flows. They
            work. But they come with trade-offs that matter at scale:
          </p>
          <ul className="list-none space-y-3 pl-0">
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">Vendor lock-in.</strong>{" "}
                Proprietary billing means your revenue depends on a single
                platform&apos;s uptime, pricing decisions, and terms of service. If
                they raise fees or shut down, you&apos;re stranded.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">Opaque metering.</strong>{" "}
                Closed platforms control how usage is measured. You trust their
                numbers. With an open standard, both provider and consumer can
                independently verify meter events.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">Ecosystem fragmentation.</strong>{" "}
                If every platform invents its own billing protocol, agents need a
                different integration for each one. A shared standard means one
                integration works everywhere — the same reason HTTP won over
                proprietary networking protocols.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">No community governance.</strong>{" "}
                Proprietary specs evolve based on one company&apos;s roadmap. Open
                specs evolve based on what the ecosystem actually needs. Pull
                requests beat feature requests.
              </span>
            </li>
          </ul>
          <p>
            This isn&apos;t hypothetical. We&apos;ve seen this pattern play out in payments
            (open banking vs. closed APIs), identity (OAuth/OIDC vs. proprietary
            SSO), and infrastructure (Kubernetes vs. proprietary orchestrators).
            Open standards win on a long enough timeline because they reduce
            friction for everyone.
          </p>

          {/* ───── Section 5: Trust Layer ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            The Trust Layer: Verification, SLAs, and Disputes
          </h2>
          <p>
            Billing without trust is just invoicing. The MCP billing standard
            includes a trust layer that makes AI agent payments safe for both
            sides:
          </p>

          <h3 className="text-lg font-semibold text-white/80 mt-8 mb-3">
            Provider Verification
          </h3>
          <p>
            Providers register with a verifiable identity — domain ownership,
            GitHub org, or on-chain address. Agents can confirm they&apos;re talking
            to the real provider, not a man-in-the-middle. Verification status is
            included in discovery responses so agents can filter for verified-only
            providers.
          </p>

          <h3 className="text-lg font-semibold text-white/80 mt-8 mb-3">
            SLA Metrics
          </h3>
          <p>
            Every provider exposes machine-readable SLA metrics: uptime
            percentage, p50/p95/p99 latency, error rate, and median response
            quality score. These aren&apos;t self-reported — they&apos;re aggregated from
            actual consumer interactions and independently auditable.
          </p>
          <p>
            This means an agent can make decisions like: &ldquo;I need a code
            analysis tool with &lt;500ms p95 latency and 99.5% uptime. Show me
            options.&rdquo; No human research required. The agent shops for tools
            the way a load balancer picks healthy backends.
          </p>

          <h3 className="text-lg font-semibold text-white/80 mt-8 mb-3">
            Dispute Resolution
          </h3>
          <p>
            What happens when a provider charges for a tool call that returned an
            error? Or when the response doesn&apos;t match what was promised? The spec
            defines a dispute flow:
          </p>
          <ol className="list-none space-y-3 pl-0">
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">01.</span>
              <span>
                Consumer submits a dispute referencing the signed receipt and
                meter events.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">02.</span>
              <span>
                Provider responds with evidence (logs, response hashes).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">03.</span>
              <span>
                Resolution is determined by the marketplace implementation —
                automated checks for clear-cut cases (error responses billed at
                full price), human review for edge cases.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-white/30 shrink-0">04.</span>
              <span>
                Dispute outcomes feed back into the provider&apos;s trust score.
                Repeated bad behavior degrades discoverability.
              </span>
            </li>
          </ol>
          <p>
            The result is a self-correcting marketplace. Bad actors get priced out
            by the reputation system, not by a platform admin making judgment
            calls.
          </p>

          {/* ───── Section 6: Getting Started ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            Getting Started
          </h2>
          <p>
            The MCP billing standard is open and available today. Here&apos;s how to
            start:
          </p>

          <ul className="list-none space-y-4 pl-0">
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">Read the spec.</strong>{" "}
                The full specification is at{" "}
                <a
                  href="/specs/mcp-billing-v1"
                  className="text-white underline underline-offset-4 hover:text-white/80"
                >
                  /specs/mcp-billing-v1
                </a>
                . It covers pricing schemas, meter events, receipts, trust
                scores, and the dispute flow in detail.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">Browse the reference implementation.</strong>{" "}
                The{" "}
                <a
                  href="https://github.com/TombStoneDash/mcp-billing-spec"
                  className="text-white underline underline-offset-4 hover:text-white/80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repo
                </a>{" "}
                includes TypeScript types, validation utilities, and example
                implementations for both providers and consumers.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">
                  Add billing to your MCP server.
                </strong>{" "}
                The minimum integration is three things: a pricing object in your
                tool manifest, meter event emission on each call, and receipt
                generation in your response. The reference implementation
                handles most of this with a single middleware wrapper.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">
                  List your tool on Agent Bazaar.
                </strong>{" "}
                Once your server supports the billing spec, you can register it
                on{" "}
                <a
                  href="/"
                  className="text-white underline underline-offset-4 hover:text-white/80"
                >
                  noui.bot
                </a>{" "}
                for discovery. Agents find you, call you, pay you — all through
                the standard protocol.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/80">Contribute.</strong>{" "}
                The spec is living. Open issues, propose extensions, or submit
                PRs. The goal is a community-owned standard, not a corporate
                one.
              </span>
            </li>
          </ul>

          {/* ───── Closing ───── */}
          <h2 className="text-xl font-bold text-white/90 mt-12 mb-4">
            The Economics Have to Work
          </h2>
          <p>
            AI agents are going to consume more API calls than humans ever did.
            The tools they use need sustainable economics. That means billing
            infrastructure that&apos;s as standardized and boring as HTTP — something
            every tool builder can adopt in an afternoon, and every agent can
            interact with automatically.
          </p>
          <p>
            The MCP billing standard is that infrastructure. It&apos;s open, it&apos;s
            implemented, and it&apos;s ready for builders who want to turn great MCP
            tools into real businesses.
          </p>
          <p className="text-white/40 italic mt-8">
            AI agent payments shouldn&apos;t require a proprietary platform. They
            should require a standard.
          </p>
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
