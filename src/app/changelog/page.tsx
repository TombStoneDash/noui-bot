import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | noui.bot",
  description: "What we shipped, when we shipped it.",
};

const entries = [
  {
    date: "2026-04-13",
    items: [
      "/getting-started tutorial: 5-step guide with language tabs (curl, JavaScript, Python) and copy-to-clipboard.",
      "/docs enhanced: Bazaar auth reference, full endpoint docs (catalog, proxy, register, usage, health), error code table (400-503), rate limit tiers.",
      "/status page: real-time health dashboard polling /api/bazaar/health — provider count, tool count, uptime, incident log.",
      "/compare page: top-level comparison — Agent Bazaar vs direct MCP vs MCP Hive with feature matrix.",
      "/api-docs: Swagger/OpenAPI UI auto-generated from /api/openapi.json.",
      "SEO: JSON-LD structured data (SoftwareApplication, Organization, FAQPage) on /pricing.",
      "Email capture: launch notification signup on homepage via /api/v1/waitlist.",
      "Performance: Cache-Control headers on all API endpoints — catalog (60s), usage (30s), health (no-store), public routes (5m).",
      "/providers/register: added webhook URL and initial tools registration fields.",
      "/pricing tiers updated: Free (100 calls/mo), Pro $29/mo (10K calls), Scale $99/mo (100K calls).",
      "GET /api/bazaar/health endpoint: status, provider count, tool count, uptime. Returns 503 if degraded.",
    ],
  },
  {
    date: "2026-04-08",
    items: [
      "Blog: 'MCP Billing: The Missing Infrastructure for AI Agent Marketplaces' — 7 billing primitives every solution needs.",
      "Blog: 'Agent Bazaar vs Building Your Own: When to Use an MCP Marketplace' — honest build-vs-buy comparison.",
      "Homepage refresh: product-first hero, audience cards, SDK install CTA.",
      "/dashboard redirect + enhanced developer dashboard.",
    ],
  },
  {
    date: "2026-03-26",
    items: [
      "Platform fee reduced: 18% → 10% — transparent, auditable billing. Providers keep 90% of revenue.",
      "All site copy, docs, blog, and API responses updated to reflect 10% fee / 90% provider share.",
      "@forthebots/mcp-server@0.2.0 published to npm — updated MCP server package.",
      "@forthebots/bazaar-sdk@0.1.2 published to npm — SDK scope finalized under @forthebots org.",
      "Glama listing claimed and verified — Agent Bazaar shows verified maintainer badge on glama.ai.",
    ],
  },
  {
    date: "2026-03-21",
    items: [
      "Blog: 'Why Metering Alone Won't Save the MCP Ecosystem' — trust primitives and why billing without verification is a house of cards.",
      "OpenClaw-native positioning: added callout section for Jensen Huang's 'OS for personal AI' vision. Agent Bazaar as the billing layer for NemoClaw-compatible agents.",
    ],
  },
  {
    date: "2026-03-14",
    items: [
      "Glama listing: glama.json + Dockerfile added for MCP search discovery.",
      "Redirect fix: /humans.txt → /.well-known/humans.txt for spec compliance.",
      "Pre-launch hardening: validator tool, marketplace bugfixes, URL audit, proxy error CTAs.",
      "Developer/provider redirect pages: /developers and /providers now route correctly.",
      "Responsive fix: blog titles no longer clip on mobile (break-words + reduced font).",
    ],
  },
  {
    date: "2026-03-07",
    items: [
      "Verified Human stack: humans.txt spec, /humans verification page, provider trust profiles, blog post on human verification for AI agent infrastructure.",
      "Homepage SSR fix: all content now crawlable for SEO — no more client-only rendering blocking Show HN bots.",
      "Blog: '43% of MCP Servers Are Vulnerable' — security audit post on the MCP ecosystem.",
      "Blog: MCP billing landscape comparison — Skyfire, x402, Stripe direct, self-build vs. Agent Bazaar.",
    ],
  },
  {
    date: "2026-03-03",
    items: [
      "/install page: one-click MCP client config generator for Claude Desktop, Windsurf, Cursor, and VS Code.",
      "Package scope migration: all @noui/ refs updated to @forthebots/ org.",
      "@forthebots/bazaar-sdk@0.1.1 published to npm.",
      "OG image: new Agent Bazaar terminal card for social sharing and Show HN.",
      "SEO: improved title tags and Twitter card metadata.",
    ],
  },
  {
    date: "2026-02-28",
    items: [
      "Public Marketplace: /marketplace — browse all tools with category filtering, search, live stats, and inline integration snippets.",
      "Pricing page: /pricing — interactive revenue calculator, build-vs-buy comparison table, FAQ.",
      "Quickstart guide: /docs/quickstart — 5-minute numbered walkthrough from registration to first metered call.",
      "Docs refresh: quick-link cards on /docs landing (Quickstart, Bazaar API, Marketplace). Version bumped to v0.4.0.",
      "Landing page: added 'Browse Tools →' CTA button linking to marketplace.",
      "Provider outreach: GitHub issues on Context7 (47K★), git-mcp (7.6K★), mcp-use (9.3K★). PR to awesome-mcp-servers (81K★).",
    ],
  },
  {
    date: "2026-02-27",
    items: [
      "Trust Layer v0.4.0: provider verification (email/domain/code), signed receipts (HMAC-SHA256), SLA reporting, dispute resolution, composite trust scores.",
      "MCP Billing Spec v1 published at /specs/mcp-billing-v1 (MIT licensed). GitHub repo: TombStoneDash/mcp-billing-spec.",
      "Comparison page: /docs/compare — feature matrix vs. Skyfire, Stripe direct, x402, self-build.",
      "Integration guides: Claude setup, LangChain, CrewAI, AutoGen at /docs/guides/*.",
      "Show HN posted: 'Agent Bazaar — Billing and metering for MCP tool servers'.",
    ],
  },
  {
    date: "2026-02-26",
    items: [
      "Landing page CTAs: 'List Your MCP Server' → /providers/register, 'Get an API Key' → /developers/register, 'Read the Docs' → /docs/bazaar.",
      "agents.json updated with billing/metering protocol declaration — pricing, balance, metering endpoints discoverable by agent crawlers.",
      "OpenAPI 3.1 spec: 21 paths, 15 Bazaar endpoints documented at /api/openapi.json.",
    ],
  },
  {
    date: "2026-02-25",
    items: [
      "Agent Bazaar billing APIs: GET /api/v1/bazaar/stats (public dashboard), GET /api/v1/bazaar/pricing (tool pricing), POST /api/v1/bazaar/meter (MCP middleware), GET /api/v1/bazaar/balance (consumer balance).",
      "/docs/bazaar — comprehensive documentation with curl examples for providers and consumers.",
      "Stripe Connect dry-run: POST /api/bazaar/balance/load (consumer top-up), POST /api/bazaar/payouts (provider payout trigger), GET /api/bazaar/payouts (payout history).",
      "Proxy reliability: 10s timeout, automatic retry on 5xx, provider health tracking, X-Bazaar-Cost / X-Bazaar-Provider / X-Bazaar-Latency response headers.",
      "Provider self-service: /providers/register page, POST /api/bazaar/tools (tool CRUD), /providers/dashboard with revenue analytics.",
      "Consumer self-service: /developers/register page, /developers/dashboard with usage analytics.",
      "Catalog fix: removed non-existent health_status column that was breaking queries.",
      "API version 0.3.0 — 18 Bazaar endpoints in the API index.",
      "NØ UI logo deployed: favicon, apple-touch-icon, OG image, meta tags.",
    ],
  },
  {
    date: "2026-02-24",
    items: [
      "Agent Bazaar proxy loop LIVE — end-to-end tool discovery, invocation, metering, and billing.",
      "BotWall3t provider: 3 tools (wallet.balance, wallet.transfer, access.verify) with real pricing.",
      "Deploy Rail provider: 3 tools (deploy.ship, deploy.status, deploy.stats).",
      "Billing math: 10% platform fee, sub-cent precision (microcents), per-call and per-token pricing.",
      "POST /api/bazaar/proxy — authenticated, metered, billed tool proxy.",
      "GET /api/bazaar/catalog — public tool listing with pricing and provider info.",
      "POST /api/bazaar/register-provider, POST /api/bazaar/register-consumer — marketplace onboarding.",
      "POST /api/bazaar/billing/provider-summary — provider earnings dashboard.",
      "POST /api/bazaar/connect — Stripe Connect onboarding for provider payouts.",
      "'Try It Now' terminal section on landing page — 3 live curl examples.",
      "Human Fallback API spec at /api/v1/human-fallback.",
    ],
  },
  {
    date: "2026-02-21",
    items: [
      "MCP server built — 7 tools: deploy, deploy_status, deploy_rail_stats, platform_stats, list_services, report_wall, apply_to_build.",
      "Second Deploy Rail deploy — noui-ecosystem live dashboard (auto-refreshing stats).",
      "OpenAPI 3.1 spec at /api/openapi.json — 8 documented paths.",
      "Rate limiting with 429 JSON responses and Retry-After headers.",
      "Standardized error responses with error codes, timestamps, docs links.",
      "/changelog page (you're reading it).",
      "Custom 404 page — 'This endpoint doesn\\'t exist. But maybe it should.'",
      "Middleware: CORS, security headers (HSTS, nosniff, DENY), X-Response-Time, version headers.",
      "robots.txt (agent-friendly), sitemap.xml.",
      "/struggles — Day 3 blog post: 'The Platform That Won\\'t Let Me Tell You About It.'",
      "/docs updated with MCP server section and OpenAPI link.",
      "SEO meta tags, canonical URLs, keyword metadata.",
      "HANDOFF.md updated for Day 3 — comprehensive project state document.",
      "GitHub READMEs overhauled for both repos (noui-bot, shiprail).",
      "Performance baseline: all API endpoints <400ms average.",
    ],
  },
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
