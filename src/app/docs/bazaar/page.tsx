import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bazaar Documentation | noui.bot",
  description: "Complete API reference for the Agent Bazaar — billing, metering, and auth for MCP servers.",
};

export default function BazaarDocsPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a href="/docs" className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors">
        &larr; docs
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Agent Bazaar
      </h1>
      <p className="text-white/40 font-mono text-sm mb-16">
        Billing, metering, and auth for MCP servers. The marketplace where agent tools get discovered, called, and paid for.
      </p>

      <div className="space-y-16">
        <Section title="What is the Bazaar?">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            The Bazaar is an agent-native service marketplace. MCP tool providers list their tools,
            set pricing, and get paid. Agent developers discover tools, make calls, and get billed.
            Every invocation is metered with sub-cent precision.
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            The platform fee is <strong className="text-white/80">18%</strong>. Providers receive 82% of every paid call.
            Free tools have no fees. Providers set their own pricing per tool.
          </p>
        </Section>

        <Section title="How It Works">
          <ol className="list-decimal list-inside text-white/60 text-sm leading-relaxed space-y-3">
            <li><strong className="text-white/80">Provider registers</strong> — POST to /api/bazaar/register-provider with MCP server URL</li>
            <li><strong className="text-white/80">Provider lists tools</strong> — POST to /api/bazaar/tools with tool definitions and pricing</li>
            <li><strong className="text-white/80">Consumer registers</strong> — POST to /api/bazaar/register-consumer, gets API key</li>
            <li><strong className="text-white/80">Consumer discovers tools</strong> — GET /api/bazaar/catalog to browse available tools</li>
            <li><strong className="text-white/80">Consumer calls tool</strong> — POST to /api/bazaar/proxy with tool_id + input</li>
            <li><strong className="text-white/80">Bazaar meters the call</strong> — Duration, tokens, cost recorded automatically</li>
            <li><strong className="text-white/80">Provider gets paid</strong> — Earnings accumulate, payout via Stripe Connect</li>
          </ol>
        </Section>

        <Section title="For Providers">
          <h3 className="font-mono text-sm text-white/50 mb-3">1. Register your MCP server</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/register-provider \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Weather Tools",
    "email": "dev@example.com",
    "endpoint_url": "https://my-server.com/mcp",
    "description": "Real-time weather data for agents"
  }'

# Returns: { "api_key": "bz_abc123...", "provider_id": "..." }
# ⚠ Save the API key — it won't be shown again.`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">2. Add your tools</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/tools \\
  -H "Authorization: Bearer bz_YOUR_PROVIDER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tools": [{
      "tool_name": "get_weather",
      "description": "Get current weather for a location",
      "category": "weather",
      "price_cents_override": 1
    }, {
      "tool_name": "get_forecast",
      "description": "7-day weather forecast",
      "category": "weather",
      "price_cents_override": 2
    }]
  }'`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">3. Check your earnings</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/billing/provider-summary \\
  -H "Authorization: Bearer bz_YOUR_PROVIDER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"period": "30d"}'`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">4. Connect Stripe for payouts</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/connect \\
  -H "Authorization: Bearer bz_YOUR_PROVIDER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"return_url": "https://your-site.com/success"}'

# Returns an onboarding URL — complete Stripe Express setup there.`}</Code>

          <p className="text-white/40 text-xs mt-4">
            Or use the self-service UI: <a href="/providers/register" className="text-white/60 underline">noui.bot/providers/register</a>
          </p>
        </Section>

        <Section title="For Developers (Agent Builders)">
          <h3 className="font-mono text-sm text-white/50 mb-3">1. Get an API key</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/register-consumer \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My AI Agent",
    "email": "dev@example.com"
  }'

# Returns: { "api_key": "bz_def456...", "balance": "$0.00" }`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">2. Discover tools</h3>
          <Code>{`# No auth required for catalog
curl https://noui.bot/api/bazaar/catalog | jq '.tools[] | {name: .tool_name, price: .pricing.price}'`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">3. Call a tool</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer bz_YOUR_CONSUMER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool_name": "wallet.balance",
    "input": {"wallet_address": "0x123...", "chain": "base"}
  }'

# Response includes:
# - result: the tool's output
# - meta: { cost_cents, latency_ms, provider, remaining_balance_cents }
# - Headers: X-Bazaar-Cost, X-Bazaar-Provider, X-Bazaar-Latency`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">4. Check usage</h3>
          <Code>{`curl https://noui.bot/api/bazaar/usage/summary \\
  -H "Authorization: Bearer bz_YOUR_CONSUMER_KEY"

# Returns: total calls, total spend, top tools, calls by day`}</Code>

          <h3 className="font-mono text-sm text-white/50 mb-3 mt-8">5. Load balance</h3>
          <Code>{`curl -X POST https://noui.bot/api/bazaar/balance/load \\
  -H "Authorization: Bearer bz_YOUR_CONSUMER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount_cents": 1000}'

# Returns Stripe Checkout URL or dry-run balance addition`}</Code>

          <p className="text-white/40 text-xs mt-4">
            Or use the self-service UI: <a href="/developers/register" className="text-white/60 underline">noui.bot/developers/register</a>
          </p>
        </Section>

        <Section title="Pricing Model">
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-white/50">Feature</th>
                  <th className="text-left p-3 text-white/50">Details</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/5"><td className="p-3">Platform fee</td><td className="p-3">18% on paid calls</td></tr>
                <tr className="border-b border-white/5"><td className="p-3">Free tools</td><td className="p-3">No fees</td></tr>
                <tr className="border-b border-white/5"><td className="p-3">Free tier per tool</td><td className="p-3">100 calls (default, configurable by provider)</td></tr>
                <tr className="border-b border-white/5"><td className="p-3">Precision</td><td className="p-3">Sub-cent (microcents = 1/10000 of a cent)</td></tr>
                <tr className="border-b border-white/5"><td className="p-3">Provider sets</td><td className="p-3">Per-call price, per-token price, free tier size</td></tr>
                <tr className="border-b border-white/5"><td className="p-3">Minimum payout</td><td className="p-3">$10.00</td></tr>
                <tr><td className="p-3">Payout method</td><td className="p-3">Stripe Connect (Express)</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="API Reference">
          <div className="space-y-6">
            <Endpoint method="GET" path="/api/bazaar/catalog" auth="None" desc="List all tools with pricing and stats" />
            <Endpoint method="GET" path="/api/v1/bazaar/stats" auth="None" desc="Public dashboard metrics" />
            <Endpoint method="GET" path="/api/v1/bazaar/pricing" auth="None" desc="Tool pricing details" />
            <Endpoint method="POST" path="/api/bazaar/register-provider" auth="None" desc="Register MCP server" />
            <Endpoint method="POST" path="/api/bazaar/register-consumer" auth="None" desc="Get consumer API key" />
            <Endpoint method="POST" path="/api/bazaar/tools" auth="Provider" desc="Register/update tools" />
            <Endpoint method="POST" path="/api/bazaar/proxy" auth="Consumer" desc="Call a tool (metered + billed)" />
            <Endpoint method="POST" path="/api/v1/bazaar/meter" auth="Any" desc="Record invocation (MCP middleware)" />
            <Endpoint method="GET" path="/api/v1/bazaar/balance" auth="Consumer" desc="Check balance" />
            <Endpoint method="GET" path="/api/v1/bazaar/usage" auth="Any" desc="Usage history" />
            <Endpoint method="GET" path="/api/v1/bazaar/usage/summary" auth="Any" desc="Aggregated usage stats" />
            <Endpoint method="POST" path="/api/bazaar/billing/provider-summary" auth="Provider" desc="Earnings summary" />
            <Endpoint method="POST" path="/api/bazaar/balance/load" auth="Consumer" desc="Add funds" />
            <Endpoint method="POST" path="/api/bazaar/payouts" auth="Provider" desc="Trigger payout" />
            <Endpoint method="POST" path="/api/bazaar/connect" auth="Provider" desc="Stripe Connect onboarding" />
          </div>
        </Section>

        <Section title="Authentication">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            All authenticated endpoints use Bearer tokens:
          </p>
          <Code>{`Authorization: Bearer bz_your_api_key_here`}</Code>
          <p className="text-white/60 text-sm leading-relaxed mt-4">
            API keys are generated at registration. They are hashed server-side (SHA-256) and cannot be recovered.
            If lost, register a new account.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-lg font-bold mb-6 pb-2 border-b border-white/10">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-xs text-white/70 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Endpoint({ method, path, auth, desc }: { method: string; path: string; auth: string; desc: string }) {
  const methodColor = method === "GET" ? "text-green-400" : "text-blue-400";
  return (
    <div className="bg-white/5 border border-white/10 rounded p-3 flex items-start gap-3">
      <span className={`font-mono text-xs font-bold ${methodColor} min-w-[40px]`}>{method}</span>
      <div className="flex-1 min-w-0">
        <code className="font-mono text-xs text-white/80 break-all">{path}</code>
        <p className="font-mono text-xs text-white/40 mt-1">{desc}</p>
      </div>
      <span className="font-mono text-[10px] text-white/30 whitespace-nowrap">{auth}</span>
    </div>
  );
}
