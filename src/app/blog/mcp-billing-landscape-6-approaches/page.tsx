import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "The MCP Billing Landscape — 6 Approaches Compared | noui.bot",
  description:
    "There are 10,000+ MCP servers. Most are hobby-quality because developers can't earn from them. Six companies are trying to fix this. Here's how they compare — and what's still missing.",
  openGraph: {
    title: "The MCP Billing Landscape — 6 Approaches Compared",
    description:
      "Six companies building MCP monetization. None have trust primitives. Here's the full comparison.",
    type: "article",
    publishedTime: "2026-02-27T00:00:00Z",
  },
};

function SectionCard({
  number,
  name,
  approach,
  strengths,
  limitation,
}: {
  number: number;
  name: string;
  approach: string;
  strengths: string;
  limitation: string;
}) {
  return (
    <div className="border border-white/10 rounded-lg p-6 mb-6">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-xs text-white/30">0{number}</span>
        <h3 className="font-mono text-lg text-white/90">{name}</h3>
      </div>
      <p className="text-sm text-white/60 leading-relaxed mb-4">{approach}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="font-mono text-xs text-green-400/60 uppercase tracking-wider">
            Strengths
          </span>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            {strengths}
          </p>
        </div>
        <div>
          <span className="font-mono text-xs text-orange-400/60 uppercase tracking-wider">
            Limitation
          </span>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            {limitation}
          </p>
        </div>
      </div>
    </div>
  );
}

function MissingPrimitive({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-red-400/60 mt-0.5">✗</span>
      <div>
        <span className="font-mono text-sm text-white/80">{label}</span>
        <p className="text-sm text-white/40 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

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
            The MCP Billing Landscape — 6 Approaches Compared
          </h1>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <time>February 27, 2026</time>
            <span>·</span>
            <span>8 min read</span>
          </div>
        </header>

        <div className="space-y-6 text-white/70 leading-relaxed">
          <p className="text-lg text-white/80">
            There are 10,000+ MCP servers. Most are hobby-quality because
            developers can&apos;t earn from them. Six companies are trying to fix
            this. Here&apos;s how they compare — and what none of them have built
            yet.
          </p>

          <div className="border-t border-white/10 my-12" />

          <SectionCard
            number={1}
            name="x402 / xpay — Crypto-Native Proxy"
            approach="Revives HTTP 402 'Payment Required' for agent payments. Wrap your API with x402 middleware, agents auto-pay with USDC on Base/Polygon. Instant settlement in ~2 seconds."
            strengths="True micropayments without aggregation. Sub-cent transactions actually work on L2. Backed by Coinbase facilitator infrastructure. Clean protocol-level design."
            limitation="Requires crypto wallets on both sides. No marketplace, no discovery, no trust primitives. If your users aren't crypto-native, this adds friction they won't tolerate."
          />

          <SectionCard
            number={2}
            name="TollBit — Closed Agent Network"
            approach="JWT-authenticated network where publishers expose content and tools. Agents get one token for everything. TollBit handles metering and settlement behind the scenes."
            strengths="Publisher relationships (NYT, etc.), demand-side advantage, multi-protocol support (MCP, NLWeb, web access). Strong business development team."
            limitation="Closed network — lock-in by design. Billing isn't actually live yet — still 'coming next.' Publisher-centric model may not attract pure tool providers."
          />

          <SectionCard
            number={3}
            name="Moesif — API Analytics → MCP Billing"
            approach="Extend existing API analytics infrastructure to meter MCP server traffic. Plug into your gateway (Kong, AWS, WSO2), define billing meters, connect to Stripe."
            strengths="Enterprise-proven. Works alongside existing API infrastructure. Sophisticated per-method, per-token, and per-outcome billing models. Real customers."
            limitation="Not a marketplace — you need to already have an MCP server and customers. Pure infrastructure play. Not building ecosystem or discovery."
          />

          <SectionCard
            number={4}
            name="Kong Konnect — Gateway → MCP"
            approach="All-in-one platform: API gateway + MCP proxy + metering + billing + developer portal. Powered by OpenMeter acquisition for real-time usage metering."
            strengths="Massive distribution — every company with a Kong gateway is a potential customer. Enterprise-grade reliability. Real-time metering at scale."
            limitation="Enterprise-focused, heavy infrastructure. Not for indie MCP developers building weekend projects. Gateway-centric, not marketplace-centric."
          />

          <SectionCard
            number={5}
            name="Nevermined — Sub-Cent L2 Payments"
            approach="Agent-to-agent payment rails on L2. Claims 35,000% transaction growth. Handles the payment primitive that other platforms can build on top of."
            strengths="Solved the micropayment problem at the protocol level. Could become foundational infrastructure that marketplaces use under the hood."
            limitation="Payment rail, not a marketplace. Complementary to platforms like Bazaar — they solve settlement, not discovery or trust."
          />

          <SectionCard
            number={6}
            name="MCP Hive — Marketplace + Monetization"
            approach="Marketplace connecting AI agents with 'commercial-grade' MCP servers. Per-request and subscription pricing. Solo developer. Launching March 8, 2026."
            strengths="Clear marketplace positioning. Content provider angle — 'brands your users already trust.' Founding community program building early network effects."
            limitation="Not launched yet. No visible trust infrastructure. No published SDK or API spec. Single developer without published technical architecture."
          />

          <div className="border-t border-white/10 my-12" />

          <h2 className="font-mono text-2xl font-bold text-white/90 mb-6">
            What&apos;s Missing From All of Them
          </h2>

          <p className="text-white/60 mb-8">
            We analyzed every competitor&apos;s public documentation, APIs, and SDKs.
            None of these six have built the trust primitives that convert
            &ldquo;hobby MCP servers&rdquo; into &ldquo;commercial-grade
            infrastructure.&rdquo;
          </p>

          <div className="space-y-4 mb-8">
            <MissingPrimitive
              label="Provider verification"
              description="Proof that a tool provider is who they claim to be — email, domain, and code-level verification"
            />
            <MissingPrimitive
              label="Signed receipts"
              description="Cryptographic proof (HMAC-SHA256) of every tool invocation — who called what, when, what it cost"
            />
            <MissingPrimitive
              label="SLA reporting"
              description="30-day uptime, latency, and error rate tracking per provider — the data agents need to choose"
            />
            <MissingPrimitive
              label="Dispute resolution"
              description="A structured way to contest charges when tools fail or deliver wrong results"
            />
            <MissingPrimitive
              label="Trust scores"
              description="A composite signal combining verification, SLA, and dispute history — so agents can make autonomous purchasing decisions"
            />
            <MissingPrimitive
              label="An open billing spec"
              description="A standard schema anyone can implement, preventing ecosystem fragmentation"
            />
          </div>

          <div className="border border-white/20 rounded-lg p-6 bg-white/[0.02]">
            <p className="text-white/70 leading-relaxed">
              These are the primitives we built at{" "}
              <a
                href="/docs/bazaar"
                className="text-white underline underline-offset-4 hover:text-white/80"
              >
                Agent Bazaar v0.4.0
              </a>
              . And we published the{" "}
              <a
                href="/specs/mcp-billing-v1"
                className="text-white underline underline-offset-4 hover:text-white/80"
              >
                MCP Billing Spec
              </a>{" "}
              (MIT licensed) so anyone — including our competitors — can
              implement the same schema.
            </p>
            <p className="text-white/50 mt-4 text-sm">
              We&apos;d rather be the reference implementation of a universal
              standard than a walled garden that fragments the ecosystem.
            </p>
          </div>

          <div className="border-t border-white/10 my-12" />

          <p className="text-sm text-white/30 italic">
            Disclosure: This analysis is based on publicly available information
            as of February 2026. We respect all teams building in this space. The
            MCP ecosystem needs multiple approaches — we&apos;re building the
            trust layer.
          </p>
        </div>
      </article>
    </main>
  );
}
