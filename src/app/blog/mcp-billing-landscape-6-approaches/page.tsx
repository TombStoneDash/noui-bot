import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "MCP Billing Landscape: 6 Approaches Compared | noui.bot",
  description:
    "From open billing specs to API gateways to doing nothing — six ways to monetize MCP servers, compared on setup, trust, lock-in, and cost. Plus why 43% of MCP servers have security vulnerabilities and what billing infrastructure can do about it.",
  openGraph: {
    title: "MCP Billing Landscape: 6 Approaches Compared",
    description:
      "Six approaches to MCP monetization compared. Open spec vs. marketplace vs. DIY vs. gateway vs. metering platform vs. free. One has a trust layer.",
    type: "article",
    publishedTime: "2026-03-05T00:00:00Z",
  },
};

export default function MCPBillingLandscape() {
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
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-4 leading-tight">
            MCP Billing Landscape: 6 Approaches Compared
          </h1>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <time>March 5, 2026</time>
            <span>·</span>
            <span>10 min read</span>
          </div>
        </header>

        <div className="space-y-6 text-white/70 leading-relaxed">
          {/* --- Intro --- */}
          <p className="text-lg text-white/80">
            There are 10,000+ MCP servers. The overwhelming majority are free,
            unmonetized, and — according to{" "}
            <a
              href="https://adversa.ai/mcp-security-top-25-mcp-vulnerabilities/"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Adversa AI&apos;s research
            </a>
            {" "}— 43% have command injection vulnerabilities. That&apos;s not a
            coincidence. When nobody pays, nobody invests in security,
            reliability, or trust.
          </p>
          <p>
            Multiple teams are now building billing and monetization layers for
            MCP. They range from open standards to proprietary marketplaces to
            &ldquo;just duct-tape Stripe to it.&rdquo; This post compares six
            distinct approaches so you can decide what actually fits your stack.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- Comparison Table --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-6">
            The Comparison Table
          </h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-4 font-mono text-xs text-white/50 uppercase tracking-wider">Approach</th>
                  <th className="text-left py-3 pr-4 font-mono text-xs text-white/50 uppercase tracking-wider">Setup</th>
                  <th className="text-left py-3 pr-4 font-mono text-xs text-white/50 uppercase tracking-wider">MCP-Native</th>
                  <th className="text-left py-3 pr-4 font-mono text-xs text-white/50 uppercase tracking-wider">Trust Layer</th>
                  <th className="text-left py-3 pr-4 font-mono text-xs text-white/50 uppercase tracking-wider">Open/Proprietary</th>
                  <th className="text-left py-3 font-mono text-xs text-white/50 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white/80 font-medium">Agent Bazaar</td>
                  <td className="py-3 pr-4">~5 min (SDK wrap)</td>
                  <td className="py-3 pr-4 text-green-400/80">✓ Built for MCP</td>
                  <td className="py-3 pr-4 text-green-400/80">✓ Full</td>
                  <td className="py-3 pr-4 text-green-400/80">MIT spec</td>
                  <td className="py-3">18% tx fee</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white/80 font-medium">MCP Hive</td>
                  <td className="py-3 pr-4">Register + review</td>
                  <td className="py-3 pr-4 text-green-400/80">✓ MCP gateway</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ None published</td>
                  <td className="py-3 pr-4 text-orange-400/80">Proprietary</td>
                  <td className="py-3">TBD (not launched)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white/80 font-medium">DIY Stripe</td>
                  <td className="py-3 pr-4">Days–weeks</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ Generic</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ Build your own</td>
                  <td className="py-3 pr-4 text-white/60">Open (your code)</td>
                  <td className="py-3">2.9% + 30¢/tx</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white/80 font-medium">API Gateway</td>
                  <td className="py-3 pr-4">Days–weeks</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ Retrofit</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ Auth only</td>
                  <td className="py-3 pr-4 text-orange-400/80">Proprietary</td>
                  <td className="py-3">$300+/mo enterprise</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white/80 font-medium">Usage Billing</td>
                  <td className="py-3 pr-4">Weeks</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ Generic metering</td>
                  <td className="py-3 pr-4 text-orange-400/80">✗ None</td>
                  <td className="py-3 pr-4 text-orange-400/80">Proprietary</td>
                  <td className="py-3">$1K+/mo</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-white/80 font-medium">Free / Donation</td>
                  <td className="py-3 pr-4">Zero</td>
                  <td className="py-3 pr-4 text-white/40">N/A</td>
                  <td className="py-3 pr-4 text-red-400/80">✗ None</td>
                  <td className="py-3 pr-4 text-green-400/80">Open source</td>
                  <td className="py-3">$0 (unsustainable)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- 1. Agent Bazaar --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            1. Agent Bazaar (noui.bot) — Open Billing Standard
          </h2>
          <p>
            This is what we&apos;re building.{" "}
            <a
              href="/docs/bazaar"
              className="text-white underline underline-offset-4 hover:text-white/80"
            >
              Agent Bazaar
            </a>{" "}
            is an open billing and trust layer for MCP servers. The core idea:
            billing for agent tools should be a protocol, not a platform.
          </p>
          <p>
            You wrap your existing MCP server with our SDK (takes about 5
            minutes), set per-call or per-token pricing, and you&apos;re live.
            Every invocation generates a signed receipt (HMAC-SHA256) proving who
            called what, when, and at what cost. Receipts are tamper-evident —
            both provider and consumer can independently verify them.
          </p>
          <p>
            The{" "}
            <a
              href="/specs/mcp-billing-v1"
              className="text-white underline underline-offset-4 hover:text-white/80"
            >
              MCP Billing Spec
            </a>{" "}
            is MIT licensed. Anyone can implement it. We&apos;d rather be the
            reference implementation of a universal standard than own a walled
            garden.
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Trust layer:</strong> Provider verification (email + domain + code), 30-day SLA tracking (uptime, latency, error rate), composite trust scores, dispute resolution</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">MCP-native:</strong> Understands tool schemas, per-method pricing, token-level metering</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">No lock-in:</strong> MIT spec means you can switch implementations or self-host. Your billing data is yours.</span>
            </div>
          </div>
          <p className="text-sm text-white/50">
            Trade-off: 18% transaction fee on the hosted marketplace. If that
            doesn&apos;t work for you, self-host the spec. We literally publish
            the schema.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- 2. MCP Hive --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            2. MCP Hive — Proprietary Marketplace
          </h2>
          <p>
            <a
              href="https://mcp-hive.com"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              MCP Hive
            </a>{" "}
            is a marketplace for commercial MCP servers, positioning itself as
            the &ldquo;app store&rdquo; for MCP. Providers register their MCP
            servers, set a price per call, and MCP Hive proxies traffic through
            their gateway. They offer per-request and subscription pricing.
          </p>
          <p>
            Their pitch is compelling: &ldquo;Brands your users already
            trust.&rdquo; They&apos;re targeting content providers (news,
            finance, weather) who want to monetize data access through MCP.
            Launch date is May 2026 via their &ldquo;Project Ignite&rdquo;
            founding community program.
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">MCP-native gateway.</strong> Understands tools/list, tools/call. Not just a generic proxy.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Content provider angle.</strong> Good positioning for data monetization specifically.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">No published trust layer.</strong> No signed receipts, no SLA tracking, no dispute resolution, no trust scores.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Proprietary.</strong> No open spec, no SDK, no self-hosting option. If MCP Hive goes down, your billing goes down.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Manual review process.</strong> Every MCP server goes through Draft → Pending → Approved → Active. Gatekept.</span>
            </div>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- 3. DIY Stripe --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            3. DIY Stripe Integration — Roll Your Own
          </h2>
          <p>
            Stripe now has an{" "}
            <a
              href="https://docs.stripe.com/agentic-commerce/apps"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              MCP app framework
            </a>{" "}
            and an official MCP server. Cloudflare published templates for paid
            MCP servers on Workers. You can absolutely stitch together Stripe
            Billing + your own metering + Cloudflare Workers + custom auth.
          </p>
          <p>
            People are doing this. There are Medium posts, Reddit threads, and
            GitHub repos showing how to wire Stripe subscriptions to MCP tool
            calls with usage-based limits. It works.
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Full control.</strong> Your code, your pricing, your customer relationships.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Low payment fees.</strong> Standard Stripe rates (2.9% + 30¢).</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">You build everything.</strong> Auth, metering, rate limiting, usage tracking, customer portal, receipts — all custom.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">No discovery.</strong> Nobody finds your MCP server through Stripe. Marketing is 100% on you.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">No trust primitives.</strong> No provider verification, no SLA tracking, no signed receipts. You&apos;re on your own for accountability.</span>
            </div>
          </div>
          <p className="text-sm text-white/50">
            This is the approach if you already have customers, want maximum
            control, and don&apos;t mind spending a week or two on billing
            infrastructure. For a solo developer who just wants to get paid for a
            useful tool? Overkill.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- 4. API Gateway --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            4. API Gateway Billing (Kong, Apigee, Moesif)
          </h2>
          <p>
            Kong Konnect{" "}
            <a
              href="https://konghq.com"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              (konghq.com)
            </a>{" "}
            acquired OpenMeter and now offers API gateway + MCP proxy + metering
            + billing + developer portal as an all-in-one platform. Moesif does
            similar — plug into your gateway, define billing meters, connect to
            Stripe.
          </p>
          <p>
            These are serious enterprise tools. If you&apos;re an org with
            existing API infrastructure (Kong, AWS API Gateway, WSO2), extending
            it to meter MCP traffic is rational. You get rate limiting, API key
            management, analytics, and billing in one stack.
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Enterprise-proven.</strong> Battle-tested at scale. Real customers, real SLAs.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Sophisticated metering.</strong> Per-method, per-token, per-outcome billing models.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Not MCP-native.</strong> These are API management tools retrofitted for MCP. They don&apos;t understand tool schemas natively.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Enterprise pricing.</strong> Kong Konnect starts at $300+/month. Moesif&apos;s growth tier isn&apos;t cheap either. Not for indie developers.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">No marketplace, no trust.</strong> Pure infrastructure — you still need customers, discovery, and accountability.</span>
            </div>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- 5. Usage-Based Billing --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            5. Usage-Based Billing Platforms (Metronome, Orb, Amberflo)
          </h2>
          <p>
            Metronome, Orb, and Amberflo are usage-based billing platforms built
            for SaaS. They handle the hard part of metering — ingesting millions
            of usage events, aggregating them in real-time, and producing
            accurate invoices. Amberflo has even started{" "}
            <a
              href="https://www.amberflo.io/"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              marketing MCP metering
            </a>{" "}
            specifically.
          </p>
          <p>
            If you&apos;re building a large-scale MCP hosting platform and need
            industrial-grade metering infrastructure, these are real options. But
            they&apos;re general-purpose billing engines, not MCP-specific
            solutions.
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Industrial metering.</strong> Millions of events/second. Real-time aggregation. Accurate invoicing at scale.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Flexible pricing models.</strong> Per-unit, tiered, volume, hybrid — whatever you need.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Not MCP-aware.</strong> They meter events. They don&apos;t know what a &ldquo;tool call&rdquo; is versus a &ldquo;resource read.&rdquo;</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Expensive.</strong> Metronome and Orb start at ~$1K/month. These are enterprise tools for enterprise budgets.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-orange-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Plumbing, not product.</strong> No marketplace. No discovery. No trust. You&apos;re buying a billing engine, not a billing solution.</span>
            </div>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- 6. Free/Donation --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            6. No Billing (Free / Donation Model)
          </h2>
          <p>
            This is where 95%+ of MCP servers are today. Open source on GitHub,
            maybe a &ldquo;Buy Me a Coffee&rdquo; link, no usage tracking, no
            auth, no SLA. Some are brilliant tools. Most are weekend projects.
          </p>
          <p>
            It works for learning and experimentation. It doesn&apos;t work for
            building critical infrastructure that agents depend on. And here&apos;s
            the kicker: the security data backs this up.
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-3">
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Zero friction.</strong> npm install, done.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-green-400/80 mt-0.5">✓</span>
              <span><strong className="text-white/80">Maximum adoption.</strong> Free things spread fastest.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-red-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">No sustainability.</strong> Developers burn out. Servers go offline. Nobody&apos;s on-call at 3 AM for a free MCP server.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-red-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">No accountability.</strong> No SLAs, no receipts, no recourse when things break.</span>
            </div>
            <div className="flex gap-2 items-start">
              <span className="text-red-400/80 mt-0.5">✗</span>
              <span><strong className="text-white/80">Security vacuum.</strong> Adversa AI found 43% of MCP servers vulnerable to command injection. 37% require no authentication at all.</span>
            </div>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- Security Connection --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            The Security Problem That Billing Solves
          </h2>
          <p>
            Adversa AI&apos;s{" "}
            <a
              href="https://adversa.ai/mcp-security-top-25-mcp-vulnerabilities/"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Top 25 MCP Vulnerabilities
            </a>{" "}
            report is damning: 43% of MCP servers are vulnerable to command
            injection. 37% require no authentication. Input validation is
            &ldquo;inexcusable&rdquo; — their word — given it&apos;s been a
            solved problem since the 1990s.
          </p>
          <p>
            Why is the MCP ecosystem so vulnerable? Because there&apos;s no
            economic incentive to secure things. When your MCP server is a
            weekend project with zero revenue, you don&apos;t invest in input
            sanitization, rate limiting, or auth. You don&apos;t monitor uptime.
            You don&apos;t track SLAs.
          </p>
          <p>
            A billing layer doesn&apos;t just enable monetization — it creates
            accountability infrastructure:
          </p>
          <ul className="list-none space-y-3 pl-0 my-4">
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Provider verification</strong> means you know who&apos;s running the server. Not an anonymous GitHub user — a verified entity.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Signed receipts</strong> create an audit trail. When something goes wrong, you have cryptographic proof of what happened.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">SLA tracking</strong> surfaces unreliable providers before they cause damage. 30-day uptime, latency, and error rate — visible to consumers before they buy.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Trust scores</strong> let agents make autonomous purchasing decisions without human intervention. High trust score = safe to use. Low score = proceed with caution.</span>
            </li>
          </ul>
          <p>
            This isn&apos;t theoretical. When a billing layer requires providers
            to verify their identity and tracks their reliability, the economic
            incentives flip. Providers who want revenue invest in security
            because their trust score — and therefore their discoverability and
            revenue — depends on it.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- What Matters --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            What Actually Matters
          </h2>
          <p>
            After researching every player in this space, three things separate
            the serious approaches from the toys:
          </p>
          <div className="space-y-6 my-6">
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                1. Open vs. Proprietary
              </h3>
              <p className="text-sm text-white/60">
                MCP itself is an open protocol. The billing layer on top should
                be too. Proprietary billing creates vendor lock-in that
                contradicts MCP&apos;s entire philosophy. If your billing
                provider dies, do your revenue streams die with it? That&apos;s
                the question.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                2. Trust Primitives
              </h3>
              <p className="text-sm text-white/60">
                Billing without trust is just a payment form. When agents
                autonomously select and pay for tools, they need machine-readable
                trust signals. Provider verification, SLA history, signed
                receipts, dispute resolution — these aren&apos;t nice-to-haves.
                They&apos;re the difference between an economy and a Wild West.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                3. MCP-Native Design
              </h3>
              <p className="text-sm text-white/60">
                Generic API billing tools work but miss the point. MCP has
                unique primitives — tools, resources, prompts, sampling — that
                demand specific metering. Per-tool-call pricing. Per-resource
                access. Token-level granularity. A billing layer that
                doesn&apos;t understand these is just a proxy with a Stripe
                integration.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- Closing --- */}
          <div className="border border-white/20 rounded-lg p-6 bg-white/[0.02]">
            <h2 className="font-mono text-xl font-bold text-white/90 mb-4">
              Where We Land
            </h2>
            <p className="text-white/70 leading-relaxed">
              We built{" "}
              <a
                href="/docs/bazaar"
                className="text-white underline underline-offset-4 hover:text-white/80"
              >
                Agent Bazaar
              </a>{" "}
              because none of the existing approaches combine all three: open
              spec, trust primitives, and MCP-native design. We published the{" "}
              <a
                href="/specs/mcp-billing-v1"
                className="text-white underline underline-offset-4 hover:text-white/80"
              >
                billing spec under MIT
              </a>{" "}
              so anyone can implement it — including competitors. We built
              provider verification, signed receipts, SLA tracking, and trust
              scoring because the 43% vulnerability rate tells us the ecosystem
              needs accountability, not just payment rails.
            </p>
            <p className="text-white/50 mt-4 text-sm">
              Every approach on this list has merit. The right choice depends on
              your scale, your audience, and how much infrastructure you want to
              own. But if you believe MCP billing should be an open standard — not
              a proprietary platform — we think Bazaar is the right foundation.
            </p>
          </div>

          <div className="border-t border-white/10 my-12" />

          <p className="text-sm text-white/30 italic">
            Disclosure: We built Agent Bazaar and obviously have opinions. This
            analysis is based on publicly available information as of March 2026.
            We respect everyone building in this space — a rising tide lifts all
            boats. The MCP ecosystem is better with multiple approaches than
            with none.
          </p>
        </div>
      </article>
    </main>
  );
}
