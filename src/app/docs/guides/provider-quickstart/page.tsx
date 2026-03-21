import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provider Quickstart — List Your MCP Server | noui.bot",
  description:
    "Get your MCP server listed on Agent Bazaar in under 5 minutes. Set pricing, earn per-call revenue, and reach AI agent developers.",
};

export default function ProviderQuickstartPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">
        Provider Quickstart
      </h1>
      <p className="text-white/40 font-mono text-sm mb-16">
        List your MCP server on Agent Bazaar and start earning in under 5 minutes.
      </p>

      <div className="space-y-12">
        <Section title="Why List on Agent Bazaar?">
          <ul className="list-disc list-inside text-white/60 text-sm leading-relaxed space-y-2">
            <li>
              <strong className="text-white/80">Earn per-call revenue</strong> — set your own
              pricing (e.g., $0.01/query, $0.05/operation). You keep 82%.
            </li>
            <li>
              <strong className="text-white/80">Zero code changes</strong> — we proxy calls
              to your existing MCP server. Your tools work as-is.
            </li>
            <li>
              <strong className="text-white/80">Built-in discovery</strong> — AI agent developers
              browse the Bazaar catalog to find tools. More visibility for your project.
            </li>
            <li>
              <strong className="text-white/80">Trust &amp; verification</strong> — get a verified
              badge, SLA tracking, and trust scores that build credibility.
            </li>
            <li>
              <strong className="text-white/80">Open standard</strong> — built on the{" "}
              <a href="/specs/mcp-billing-v1" className="text-blue-400 hover:text-blue-300 underline">
                MCP Billing Spec
              </a>{" "}
              (MIT licensed). You&apos;re never locked in.
            </li>
          </ul>
        </Section>

        <Section title="Step 1: Register as a Provider">
          <Code>{`curl -X POST https://noui.bot/api/v1/bazaar/register-provider \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "your-mcp-server",
    "displayName": "Your MCP Server",
    "description": "What your server does",
    "mcpServerUrl": "https://your-server.com/mcp",
    "contact": "you@example.com"
  }'

# Response:
# {
#   "providerId": "prov_abc123",
#   "apiKey": "baz_sk_...",
#   "status": "pending_verification"
# }`}</Code>
          <p className="text-white/50 text-xs mt-2">
            Save your <code className="text-white/70">apiKey</code> — you&apos;ll need it for all provider operations.
          </p>
        </Section>

        <Section title="Step 2: List Your Tools">
          <Code>{`curl -X POST https://noui.bot/api/v1/bazaar/tools \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer baz_sk_..." \\
  -d '{
    "tools": [
      {
        "name": "search_papers",
        "description": "Search academic papers by topic",
        "pricePerCall": 0.01,
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          }
        }
      },
      {
        "name": "analyze_paper",
        "description": "Deep analysis of a specific paper",
        "pricePerCall": 0.05,
        "inputSchema": {
          "type": "object",
          "properties": {
            "paper_id": { "type": "string" }
          }
        }
      }
    ]
  }'`}</Code>
          <p className="text-white/50 text-xs mt-2">
            Set <code className="text-white/70">pricePerCall</code> to <code className="text-white/70">0</code> for free tools.
            You can mix free and paid tools.
          </p>
        </Section>

        <Section title="Step 3: Verify Your Identity (Optional but Recommended)">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Verified providers get a trust badge, higher catalog placement, and more consumer confidence.
          </p>
          <Code>{`# Start email verification
curl -X POST https://noui.bot/api/v1/bazaar/providers/verify \\
  -H "Authorization: Bearer baz_sk_..." \\
  -d '{ "method": "email" }'

# You'll receive a verification code at your contact email.
# Submit it:
curl -X POST https://noui.bot/api/v1/bazaar/providers/verify \\
  -H "Authorization: Bearer baz_sk_..." \\
  -d '{ "method": "email", "code": "ABC123" }'`}</Code>
        </Section>

        <Section title="Step 4: Monitor Your Earnings">
          <Code>{`# Check your trust score and SLA
curl https://noui.bot/api/v1/bazaar/providers/YOUR_ID/trust \\
  -H "Authorization: Bearer baz_sk_..."

# Response includes:
# - trustScore (0-100)
# - badge (unverified/bronze/silver/gold)
# - sla (uptime %, avg latency, error rate)
# - totalCalls, totalRevenue`}</Code>
        </Section>

        <Section title="How Billing Works">
          <div className="space-y-4 text-sm text-white/60 leading-relaxed">
            <p>
              When an agent consumer calls your tool through the Bazaar proxy:
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>The call is metered (duration, tokens, cost)</li>
              <li>A <strong className="text-white/80">signed receipt</strong> (HMAC-SHA256) is generated</li>
              <li>The consumer is charged at your set price</li>
              <li>You receive <strong className="text-white/80">90%</strong> (Bazaar takes 10%)</li>
              <li>Earnings accumulate and pay out monthly via Stripe Connect</li>
            </ol>
            <p>
              Every transaction is auditable. Consumers can dispute charges through the{" "}
              <a href="/docs/bazaar" className="text-blue-400 hover:text-blue-300 underline">
                dispute resolution system
              </a>.
            </p>
          </div>
        </Section>

        <Section title="Pricing Examples">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-white/60">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 font-mono text-white/40 text-xs">Tool Type</th>
                  <th className="text-left py-2 font-mono text-white/40 text-xs">Suggested Price</th>
                  <th className="text-left py-2 font-mono text-white/40 text-xs">You Earn (82%)</th>
                  <th className="text-left py-2 font-mono text-white/40 text-xs">1K calls/day</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b border-white/5">
                  <td className="py-2">Search/lookup</td>
                  <td className="py-2">$0.005</td>
                  <td className="py-2">$0.0041</td>
                  <td className="py-2">$123/mo</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2">Data retrieval</td>
                  <td className="py-2">$0.01</td>
                  <td className="py-2">$0.0082</td>
                  <td className="py-2">$246/mo</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2">Analysis/computation</td>
                  <td className="py-2">$0.05</td>
                  <td className="py-2">$0.041</td>
                  <td className="py-2">$1,230/mo</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2">Document generation</td>
                  <td className="py-2">$0.10</td>
                  <td className="py-2">$0.082</td>
                  <td className="py-2">$2,460/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="FAQ">
          <div className="space-y-6">
            <FAQ
              q="Do I need to change my MCP server code?"
              a="No. We proxy calls to your existing server. Your tools work exactly as they do today."
            />
            <FAQ
              q="What if I want to offer some tools for free?"
              a="Set pricePerCall to 0. Free tools have no fees. You can mix free and paid tools on the same server."
            />
            <FAQ
              q="Am I locked into Agent Bazaar?"
              a="No. The billing spec is MIT licensed. You can implement it yourself or switch providers anytime. Your MCP server stays yours."
            />
            <FAQ
              q="How do payouts work?"
              a="Earnings accumulate in your provider account. Monthly payouts via Stripe Connect. Minimum payout: $10."
            />
            <FAQ
              q="What's the minimum price I can set?"
              a="$0.001 per call (one-tenth of a cent). Sub-cent precision is supported."
            />
          </div>
        </Section>

        <div className="border-t border-white/10 pt-8 mt-16">
          <p className="text-white/40 text-sm">
            Questions? Open an issue on{" "}
            <a
              href="https://github.com/TombStoneDash/mcp-billing-spec"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              GitHub
            </a>{" "}
            or email{" "}
            <a
              href="mailto:info@tombstonedash.com"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              info@tombstonedash.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-mono text-lg text-white/80 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-white/5 border border-white/10 rounded p-4 text-xs font-mono text-green-400/80 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-white/80 text-sm font-medium mb-1">{q}</p>
      <p className="text-white/50 text-sm">{a}</p>
    </div>
  );
}
