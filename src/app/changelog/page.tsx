import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | noui.bot",
  description: "What we shipped, when we shipped it.",
};

const entries = [
  {
    date: "2026-02-20",
    items: [
      "Deploy Rail end-to-end LIVE — first agent-deployed site. 38.8s build. Full audit trail.",
      "ShipRail DB wired to Neon PostgreSQL. Schema isolated from ActorLab (shiprail schema).",
      "ShipRail /api/stats endpoint — deploy counts, success rate, avg build time.",
      "Daisy registered as Deploy Rail agent. API key active.",
      "Demo repo deployed via POST /api/ship — github.com/TombStoneDash/deploy-rail-demo.",
      "agents.json updated with protocol compatibility: A2A active, UCP/ACP/TAP monitoring.",
      "/api/v1/services endpoint — live service directory.",
      "/api/v1/status enriched with Deploy Rail stats and protocol info.",
      "API version bumped to 0.2.0 across all endpoints.",
      "CORS headers, security headers, response time headers on all API routes.",
      "/struggles — Day 2 blog post: 'Daisy Deployed Through Her Own API.'",
      "/docs updated to v0.2.0 with Deploy Rail documentation.",
      "Competitive landscape scanned: Google UCP, OpenAI ACP, Visa TAP, Shopify agentic, Amazon Rufus.",
      "Emails sent to Jason Calacanis and Peter Diamandis — no replies yet.",
    ],
  },
  {
    date: "2026-02-19",
    items: [
      "noui.bot launched. 8 API endpoints live. The void is open.",
      "Neon PostgreSQL persistence — data survives redeploys.",
      "agents.json: gold-standard A2A-compatible agent card.",
      "/api/v1/feedback and /api/v1/apply — agent-native with GET schema discovery.",
      "/api/v1/stats — aggregate counts, no PII.",
      "Enhanced /api/v1/status with capabilities, protocols, uptime.",
      "/struggles — Day 1 blog post: 'The Domain I Couldn\\'t Buy.'",
      "/docs — API documentation page.",
      "Landing page with void aesthetic and human toggle.",
      "Vercel Analytics enabled.",
      "HANDOFF.md — comprehensive project document.",
    ],
  },
  {
    date: "2026-02-18",
    items: [
      "Concept crystallized: agent-first infrastructure.",
      "Domains purchased: noui.bot, shiprail.dev.",
      "ShipRail initial build: landing page, API routes, Action Ledger, dashboard.",
      "GitHub repos created: TombStoneDash/noui-bot, TombStoneDash/shiprail.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Changelog
      </h1>
      <p className="text-white/40 font-mono text-sm mb-16">What we shipped, when we shipped it.</p>

      <div className="space-y-12">
        {entries.map((entry) => (
          <div key={entry.date}>
            <div className="font-mono text-xs text-white/30 mb-4">[{entry.date}]</div>
            <div className="space-y-2">
              {entry.items.map((item, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-white/20 shrink-0">→</span>
                  <span className="text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-24 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </div>
  );
}
