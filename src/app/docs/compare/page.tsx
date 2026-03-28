import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Bazaar — How We Compare | noui.bot",
  description:
    "Agent Bazaar vs MCPize, xpay, TollBit, MCP Hive, and build-your-own. Trust-first billing for MCP tools.",
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
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">MCPize</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">xpay</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">TollBit</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-2">MCP Hive</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            <Row feature="Live & shipping" vals={["✅", "✅", "✅", "⏳ billing soon", "⏳"]} />
            <Row feature="Revenue share" vals={["90%", "85%", "N/A", "TBD", "TBD"]} />
            <Row feature="Payment rail" vals={["Stripe (fiat)", "Stripe", "USDC (crypto)", "TBD", "TBD"]} />
            <Row feature="Provider verification" vals={["✅ 4 levels", "❌", "❌", "❌", "❌"]} />
            <Row feature="Signed receipts" vals={["✅ HMAC-SHA256", "❌", "❌", "❌", "❌"]} />
            <Row feature="SLA reporting" vals={["✅ uptime/latency/p95", "❌", "❌", "❌", "❌"]} />
            <Row feature="Dispute resolution" vals={["✅ full flow", "❌", "❌", "❌", "❌"]} />
            <Row feature="Trust scores" vals={["✅ composite", "❌", "❌", "❌", "❌"]} />
            <Row feature="Open billing spec" vals={["✅ MIT licensed", "❌", "x402 (protocol)", "❌", "❌"]} />
            <Row feature="Hosting included" vals={["❌ BYO", "✅", "❌", "✅", "✅"]} />
            <Row feature="TypeScript SDK" vals={["✅", "✅ CLI", "✅", "✅", "❌"]} />
            <Row feature="OpenAPI spec" vals={["✅ v3.1", "❌", "❌", "❌", "❌"]} />
            <Row feature="Tool marketplace" vals={["✅ catalog", "✅ 100+", "❌", "✅ network", "✅ catalog"]} />
            <Row feature="Sub-cent metering" vals={["✅ microcents", "✅", "✅ USDC", "⏳", "❓"]} />
            <Row feature="Spending controls" vals={["Balance system", "Quota controls", "✅ Smart Proxy", "JWT quotas", "❓"]} />
            <Row feature="agents.json" vals={["✅", "❌", "❌", "❌", "❌"]} />
          </tbody>
        </table>
      </div>

      {/* Detailed Comparisons */}
      <section className="space-y-16">
        <ComparisonSection
          title="Bazaar vs MCPize"
          description="MCPize is the most direct competitor — a marketplace with hosting and monetization. Similar concept, different priorities."
          points={[
            { label: "Revenue share", detail: "We give providers 90%. MCPize gives 85%. On a provider earning $10K/month, that's $500/month more with Bazaar." },
            { label: "Trust", detail: "We have a full trust layer: 4-level provider verification, HMAC-SHA256 signed receipts, SLA reporting, dispute resolution, and composite trust scores. MCPize has none of these — zero provider verification, no receipts, no SLAs." },
            { label: "Open standard", detail: "We published the MCP Billing Spec (MIT licensed) — anyone can build on it. MCPize is proprietary. Lock-in by design." },
            { label: "Hosting", detail: "MCPize includes hosting (one-click deploy). We're BYO hosting — you deploy your server wherever you want. Trade-off: their approach is easier to start, ours gives more control." },
            { label: "Agents.json", detail: "We support agents.json for agent discovery. MCPize doesn't. In an agent-first world, machine-readable discovery is table stakes." },
          ]}
        />

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
          This comparison is based on publicly available information as of March 2026.
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

function Row({ feature, vals }: { feature: string; vals: string[] }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-4 text-white/70">{feature}</td>
      <td className="py-2 px-2 text-center text-green-400/80">{vals[0]}</td>
      {vals.slice(1).map((v, i) => (
        <td key={i} className="py-2 px-2 text-center text-white/50">{v}</td>
      ))}
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
