import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare — Agent Bazaar vs Direct MCP vs MCP Hive | noui.bot",
  description:
    "How Agent Bazaar compares to running MCP servers directly and MCP Hive. Feature matrix, trust primitives, pricing, and trade-offs.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-5xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        How We Compare
      </h1>
      <p className="text-white/40 text-sm mb-16 max-w-2xl leading-relaxed">
        Three ways to run paid MCP tools. Here&apos;s the honest breakdown.
      </p>

      {/* Main Comparison Table */}
      <div className="overflow-x-auto mb-16">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left font-mono text-xs text-white/40 uppercase tracking-wider py-3 pr-4 w-1/4">Feature</th>
              <th className="text-center font-mono text-xs text-emerald-400/60 uppercase tracking-wider py-3 px-4 w-1/4">Agent Bazaar</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-4 w-1/4">Direct MCP</th>
              <th className="text-center font-mono text-xs text-white/40 uppercase tracking-wider py-3 px-4 w-1/4">MCP Hive</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            <Row feature="Setup time" vals={["5 minutes", "2-4 weeks", "~1 hour"]} />
            <Row feature="Billing included" vals={["Per-call + per-token", "Build yourself", "TBD"]} />
            <Row feature="Revenue share" vals={["90% to provider", "100% (you handle billing)", "TBD"]} />
            <Row feature="Provider verification" vals={["4 levels", "None", "Curated vetting"]} />
            <Row feature="Signed receipts" vals={["HMAC-SHA256", "None", "None"]} />
            <Row feature="SLA monitoring" vals={["Uptime, latency, p95", "DIY", "None"]} />
            <Row feature="Dispute resolution" vals={["Full workflow", "DIY / support tickets", "None"]} />
            <Row feature="Trust scores" vals={["Composite scoring", "None", "Curated list"]} />
            <Row feature="Tool discovery" vals={["Public catalog + API", "None", "Catalog"]} />
            <Row feature="Rate limiting" vals={["Per-consumer, tiered", "DIY", "Unknown"]} />
            <Row feature="Sub-cent metering" vals={["Microcent precision", "DIY", "Unknown"]} />
            <Row feature="TypeScript SDK" vals={["@forthebots/bazaar-sdk", "N/A", "None"]} />
            <Row feature="OpenAPI spec" vals={["v3.1", "N/A", "None"]} />
            <Row feature="Open billing spec" vals={["MIT licensed", "N/A", "Proprietary"]} />
            <Row feature="Hosting" vals={["BYO (you control)", "Your server", "Included"]} />
            <Row feature="Vendor lock-in" vals={["None (open spec)", "None", "Platform-dependent"]} />
            <Row feature="Payment rail" vals={["Stripe (fiat)", "Your choice", "TBD"]} />
          </tbody>
        </table>
      </div>

      {/* Detailed Sections */}
      <section className="space-y-16">
        <ComparisonSection
          title="Agent Bazaar vs Direct MCP"
          description="Running MCP tools without a billing layer — the DIY approach."
          points={[
            { label: "The good", detail: "Zero platform fees, total control over every aspect. You keep 100% of revenue and answer to nobody." },
            { label: "The cost", detail: "You build billing, metering, rate limiting, auth, and trust from scratch. Stripe integration alone takes days. Sub-cent metering is surprisingly hard." },
            { label: "Discovery", detail: "Direct MCP means zero marketplace visibility. You market yourself. Bazaar puts you in front of every agent on the platform." },
            { label: "Trust", detail: "No verification badges, no trust scores, no SLA reporting, no dispute resolution. Consumers have no signal on provider quality." },
            { label: "When direct wins", detail: "You have a single high-value client, existing billing infrastructure, or deeply custom requirements that no marketplace can serve." },
          ]}
        />

        <ComparisonSection
          title="Agent Bazaar vs MCP Hive"
          description="MCP Hive is a curated marketplace with a vetting-first model."
          points={[
            { label: "Approach", detail: "Hive focuses on curated/vetted providers via Project Ignite. Bazaar is open registration with trust scores that let quality emerge organically." },
            { label: "Trust model", detail: "Hive vets providers manually. Bazaar uses 4 verification levels, HMAC-SHA256 receipts, SLA monitoring, dispute resolution, and composite trust scores — automated and transparent." },
            { label: "Open standard", detail: "Bazaar publishes the MCP Billing Spec (MIT licensed). MCP Hive is proprietary. Our spec is portable — if you outgrow us, take it." },
            { label: "SDK & API", detail: "Bazaar ships a TypeScript SDK, OpenAPI 3.1 spec, and agents.json for machine discovery. MCP Hive has a catalog but no public SDK or spec." },
            { label: "When Hive wins", detail: "You want a curated experience and are willing to go through a vetting process. Quality gate up front vs. trust scores over time." },
          ]}
        />
      </section>

      {/* CTA */}
      <div className="mt-16 pt-8 border-t border-white/10">
        <div className="flex items-center gap-4 flex-wrap mb-8">
          <a href="/get-started" className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors">
            Get Started Free
          </a>
          <a href="/docs/compare" className="font-mono text-sm border border-white/20 text-white/60 px-6 py-3 rounded hover:border-white/40 hover:text-white transition-colors">
            Full 5-Way Comparison
          </a>
          <a href="/pricing" className="font-mono text-sm text-white/30 hover:text-white/50 transition-colors">
            View Pricing
          </a>
        </div>
      </div>

      <footer className="mt-8 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          This comparison is based on publicly available information as of April 2026.
          We respect all teams building in this space.
        </p>
      </footer>
    </div>
  );
}

function Row({ feature, vals }: { feature: string; vals: string[] }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2.5 pr-4 text-white/70">{feature}</td>
      <td className="py-2.5 px-4 text-center text-emerald-400/80">{vals[0]}</td>
      {vals.slice(1).map((v, i) => (
        <td key={i} className="py-2.5 px-4 text-center text-white/50">{v}</td>
      ))}
    </tr>
  );
}

function ComparisonSection({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: { label: string; detail: string }[];
}) {
  return (
    <div>
      <h2 className="font-mono text-lg text-white/90 mb-2">{title}</h2>
      <p className="text-white/40 text-sm mb-6">{description}</p>
      <div className="space-y-4">
        {points.map((p) => (
          <div key={p.label} className="pl-4 border-l border-white/10">
            <span className="font-mono text-xs text-white/60 uppercase tracking-wider">
              {p.label}
            </span>
            <p className="text-sm text-white/50 mt-1">{p.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
