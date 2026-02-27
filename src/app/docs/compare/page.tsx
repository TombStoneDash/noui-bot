import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Bazaar — How We Compare | noui.bot",
  description:
    "Agent Bazaar vs xpay, TollBit, MCP Hive, and build-your-own. Trust-first billing for MCP tools.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-5xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Why Agent Bazaar?
      </h1>
      <p className="text-white/40 text-sm mb-16 max-w-2xl leading-relaxed">
        The MCP billing space is growing fast. Here&apos;s how we compare &mdash; honestly.
      </p>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-16">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left font-mono text-xs text-white/40 uppercase tracking-wider py-3 pr-4">Feature</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">Bazaar</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">xpay</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">TollBit</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">MCP Hive</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            <Row feature="Live & shipping" bazaar="✅" xpay="✅" tollbit="⏳ billing soon" hive="⏳ Mar 8" />
            <Row feature="Payment rail" bazaar="Stripe (fiat)" xpay="USDC (crypto)" tollbit="TBD" hive="TBD" />
            <Row feature="Provider verification" bazaar="✅ 4 levels" xpay="❌" tollbit="❌" hive="❌" />
            <Row feature="Signed receipts" bazaar="✅ HMAC-SHA256" xpay="❌" tollbit="❌" hive="❌" />
            <Row feature="SLA reporting" bazaar="✅ uptime/latency/p95" xpay="❌" tollbit="❌" hive="❌" />
            <Row feature="Dispute resolution" bazaar="✅ full flow" xpay="❌" tollbit="❌" hive="❌" />
            <Row feature="Trust scores" bazaar="✅ composite" xpay="❌" tollbit="❌" hive="❌" />
            <Row feature="Open billing spec" bazaar="✅ MIT licensed" xpay="x402 (protocol)" tollbit="❌" hive="❌" />
            <Row feature="TypeScript SDK" bazaar="✅" xpay="✅" tollbit="✅" hive="❌" />
            <Row feature="OpenAPI spec" bazaar="✅ v3.1" xpay="❌" tollbit="❌" hive="❌" />
            <Row feature="Tool marketplace" bazaar="✅ catalog" xpay="❌" tollbit="✅ network" hive="✅ catalog" />
            <Row feature="Sub-cent metering" bazaar="✅ microcents" xpay="✅ USDC" tollbit="⏳" hive="❓" />
            <Row feature="Spending controls" bazaar="Balance system" xpay="✅ Smart Proxy" tollbit="JWT quotas" hive="❓" />
            <Row feature="agents.json" bazaar="✅" xpay="❌" tollbit="❌" hive="❌" />
          </tbody>
        </table>
      </div>

      {/* Detailed Comparisons */}
      <section className="space-y-16">
        <ComparisonSection
          title="Bazaar vs xpay"
          description="xpay is the closest competitor. Same core primitive — proxy + per-tool pricing. Different everything else."
          points={[
            { label: "Payment rail", detail: "We use Stripe (credit cards, ACH, wire). xpay uses USDC on Base/Polygon. Stripe has 2M+ businesses. Crypto wallets have friction for non-crypto users." },
            { label: "Trust", detail: "We have a full trust layer: verified providers, signed receipts, SLAs, disputes, trust scores. xpay has spending controls (Smart Proxy) but zero provider trust." },
            { label: "Discovery", detail: "We have a tool catalog/marketplace. xpay is protocol-only — no discovery." },
            { label: "Open standard", detail: "We published the MCP Billing Spec. xpay builds on x402 (an HTTP payment protocol). Different layers — x402 is a payment protocol, our spec is a billing schema." },
          ]}
        />

        <ComparisonSection
          title="Bazaar vs TollBit"
          description="TollBit started as content monetization for publishers. They're expanding into MCP but billing isn't live yet."
          points={[
            { label: "Status", detail: "Our billing is live. TollBit's docs say billing is 'coming next.' Their MCP tools work but monetization is still in development." },
            { label: "Model", detail: "We're an open marketplace. TollBit is a closed network — both sides go through TollBit. Lock-in by design." },
            { label: "Trust", detail: "They have JWT-based auth (basic caller validation). We have verification, receipts, SLAs, disputes, and trust scores." },
            { label: "Strength", detail: "TollBit has publisher relationships (Times, etc.) — real demand-side advantage for content. We're stronger for pure API/tool providers." },
          ]}
        />

        <ComparisonSection
          title="Bazaar vs MCP Hive"
          description="MCP Hive launches March 8. Similar marketplace concept, different execution."
          points={[
            { label: "Status", detail: "We're live with working billing. MCP Hive is pre-launch (Project Ignite is their early access program)." },
            { label: "Trust", detail: "They mention 'vetted' providers but describe no verification system. We have 4 verification levels, signed receipts, and trust scores." },
            { label: "Standard", detail: "We published an open billing spec. MCP Hive is proprietary." },
            { label: "SDK", detail: "We have a TypeScript SDK and OpenAPI spec. MCP Hive has neither (publicly)." },
          ]}
        />

        <ComparisonSection
          title="Bazaar vs Build-Your-Own"
          description="Why not just add Stripe to your MCP server directly?"
          points={[
            { label: "Time", detail: "Building metering, billing, receipts, disputes, and trust from scratch takes weeks. Bazaar integration takes minutes." },
            { label: "Discovery", detail: "Self-built billing means zero marketplace visibility. Bazaar puts you in front of every agent using the platform." },
            { label: "Trust", detail: "Self-built means no verification badges, no trust scores, no dispute resolution. Agents have no signal on provider quality." },
            { label: "Standard", detail: "Self-built means proprietary schemas. Bazaar uses the open MCP Billing Spec — portable, interoperable." },
          ]}
        />
      </section>

      <footer className="mt-24 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          This comparison is based on publicly available information as of February 2026.
          We respect all teams building in this space &mdash; the ecosystem needs multiple approaches.
        </p>
        <p className="font-mono text-xs text-white/20 mt-2">
          <a href="/specs/mcp-billing-v1" className="text-blue-400/50 hover:text-blue-400">Read the spec</a>
          {" · "}
          <a href="/docs/bazaar" className="text-blue-400/50 hover:text-blue-400">Bazaar docs</a>
          {" · "}
          <a href="https://github.com/TombStoneDash/noui-bot" className="text-blue-400/50 hover:text-blue-400">GitHub</a>
        </p>
      </footer>
    </div>
  );
}

function Row({ feature, bazaar, xpay, tollbit, hive }: { feature: string; bazaar: string; xpay: string; tollbit: string; hive: string }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-4 text-white/70">{feature}</td>
      <td className="py-2 px-2 text-center text-green-400/80">{bazaar}</td>
      <td className="py-2 px-2 text-center text-white/50">{xpay}</td>
      <td className="py-2 px-2 text-center text-white/50">{tollbit}</td>
      <td className="py-2 px-2 text-center text-white/50">{hive}</td>
    </tr>
  );
}

function ComparisonSection({ title, description, points }: { title: string; description: string; points: { label: string; detail: string }[] }) {
  return (
    <div>
      <h2 className="font-mono text-lg text-white/90 mb-2">{title}</h2>
      <p className="text-white/40 text-sm mb-6">{description}</p>
      <div className="space-y-4">
        {points.map((p) => (
          <div key={p.label} className="pl-4 border-l border-white/10">
            <span className="font-mono text-xs text-white/60 uppercase tracking-wider">{p.label}</span>
            <p className="text-sm text-white/50 mt-1">{p.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
