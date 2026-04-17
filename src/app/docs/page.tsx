import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | noui.bot",
  description: "API documentation for noui.bot agent-first infrastructure.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        API Documentation
      </h1>
      <p className="text-white/40 font-mono text-sm mb-8">v0.4.0 &middot; Updated 2026-02-28</p>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <a href="/docs/quickstart" className="flex items-center gap-3 p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-lg hover:border-emerald-500/30 transition-colors group">
          <span className="text-lg">⚡</span>
          <div>
            <div className="font-mono text-sm font-bold text-emerald-400">Quickstart</div>
            <div className="font-mono text-xs text-white/30">5-minute guide</div>
          </div>
        </a>
        <a href="/docs/bazaar" className="flex items-center gap-3 p-4 border border-white/[0.08] rounded-lg hover:border-white/[0.15] transition-colors group">
          <span className="text-lg">🏪</span>
          <div>
            <div className="font-mono text-sm font-bold text-white/80">Bazaar API</div>
            <div className="font-mono text-xs text-white/30">Full reference</div>
          </div>
        </a>
        <a href="/marketplace" className="flex items-center gap-3 p-4 border border-white/[0.08] rounded-lg hover:border-white/[0.15] transition-colors group">
          <span className="text-lg">🔍</span>
          <div>
            <div className="font-mono text-sm font-bold text-white/80">Marketplace</div>
            <div className="font-mono text-xs text-white/30">Browse tools</div>
          </div>
        </a>
      </div>

      {/* Provider Section */}
      <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-6 mb-16">
        <h2 className="font-mono text-sm font-bold text-amber-400 mb-3">🔧 For MCP Server Developers</h2>
        <p className="text-white/50 text-sm mb-4">
          Monetize your MCP server with zero code changes. Set per-call pricing and start earning.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a href="/docs/guides/provider-quickstart" className="flex items-center gap-2 p-3 border border-white/[0.08] rounded hover:border-amber-500/30 transition-colors">
            <span className="text-sm">📋</span>
            <div>
              <div className="font-mono text-xs font-bold text-white/80">Provider Quickstart</div>
              <div className="font-mono text-[10px] text-white/30">List your server in 5 min</div>
            </div>
          </a>
          <a href="/docs/guides/monetize-mcp-server" className="flex items-center gap-2 p-3 border border-white/[0.08] rounded hover:border-amber-500/30 transition-colors">
            <span className="text-sm">💰</span>
            <div>
              <div className="font-mono text-xs font-bold text-white/80">TypeScript Guide</div>
              <div className="font-mono text-[10px] text-white/30">SDK integration code</div>
            </div>
          </a>
          <a href="/specs/mcp-billing-v1" className="flex items-center gap-2 p-3 border border-white/[0.08] rounded hover:border-amber-500/30 transition-colors">
            <span className="text-sm">📄</span>
            <div>
              <div className="font-mono text-xs font-bold text-white/80">Billing Spec (MIT)</div>
              <div className="font-mono text-[10px] text-white/30">Open standard</div>
            </div>
          </a>
        </div>
      </div>

      <section className="space-y-16">
        {/* Base URL */}
        <DocSection title="Base URL">
          <CodeBlock>https://noui.bot/api/v1</CodeBlock>
        </DocSection>

        {/* Authentication */}
        <DocSection title="Authentication">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Bazaar endpoints use Bearer token authentication. Keys are issued during
            provider or consumer registration and follow the format <code className="text-white/70">bz_*</code>.
          </p>
          <CodeBlock>{`Authorization: Bearer bz_a1b2c3d4e5f6...`}</CodeBlock>
          <div className="mt-4 space-y-3 text-sm text-white/50">
            <p><strong className="text-white/70">Provider keys</strong> — permissions: <code className="text-white/60">read</code>, <code className="text-white/60">write</code>, <code className="text-white/60">manage_tools</code></p>
            <p><strong className="text-white/70">Consumer keys</strong> — permissions: <code className="text-white/60">read</code>, <code className="text-white/60">call_tools</code></p>
            <p className="text-white/40">Public endpoints (catalog, health, stats) require no authentication.</p>
          </div>
        </DocSection>

        {/* Error Codes */}
        <DocSection title="Error Codes">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            All errors return JSON with <code className="text-white/70">error</code> and <code className="text-white/70">message</code> fields.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left font-mono text-xs text-white/30 py-2 pr-4">Code</th>
                  <th className="text-left font-mono text-xs text-white/30 py-2 pr-4">Meaning</th>
                  <th className="text-left font-mono text-xs text-white/30 py-2">When</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">400</td><td className="py-2 pr-4 text-white/50">Bad Request</td><td className="py-2 text-white/40">Missing required fields, invalid JSON</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">401</td><td className="py-2 pr-4 text-white/50">Unauthorized</td><td className="py-2 text-white/40">Missing or invalid API key</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">402</td><td className="py-2 pr-4 text-white/50">Payment Required</td><td className="py-2 text-white/40">Insufficient balance for tool call</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">403</td><td className="py-2 pr-4 text-white/50">Forbidden</td><td className="py-2 text-white/40">Key lacks required permission</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">404</td><td className="py-2 pr-4 text-white/50">Not Found</td><td className="py-2 text-white/40">Tool or provider not found</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">429</td><td className="py-2 pr-4 text-white/50">Rate Limited</td><td className="py-2 text-white/40">Exceeded requests per minute</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">500</td><td className="py-2 pr-4 text-white/50">Internal Error</td><td className="py-2 text-white/40">Server error — retry with backoff</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">502</td><td className="py-2 pr-4 text-white/50">Bad Gateway</td><td className="py-2 text-white/40">Provider endpoint unreachable</td></tr>
                <tr><td className="py-2 pr-4 text-white/70">503</td><td className="py-2 pr-4 text-white/50">Degraded</td><td className="py-2 text-white/40">Platform health issue</td></tr>
              </tbody>
            </table>
          </div>
          <CodeBlock>{`// Error response format
{
  "error": true,
  "message": "Insufficient balance",
  "code": "INSUFFICIENT_FUNDS",
  "required_cents": 5,
  "balance_cents": 2
}`}</CodeBlock>
        </DocSection>

        {/* Rate Limits */}
        <DocSection title="Rate Limits">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Rate limits are enforced per API key. Exceeding limits returns <code className="text-white/70">429</code> with a <code className="text-white/70">Retry-After</code> header.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left font-mono text-xs text-white/30 py-2 pr-4">Tier</th>
                  <th className="text-left font-mono text-xs text-white/30 py-2 pr-4">RPM</th>
                  <th className="text-left font-mono text-xs text-white/30 py-2">Monthly Calls</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">Free</td><td className="py-2 pr-4 text-white/50">60</td><td className="py-2 text-white/50">100</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4 text-white/70">Pro</td><td className="py-2 pr-4 text-white/50">300</td><td className="py-2 text-white/50">10,000</td></tr>
                <tr><td className="py-2 pr-4 text-white/70">Scale</td><td className="py-2 pr-4 text-white/50">1,000</td><td className="py-2 text-white/50">100,000</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-white/40 text-sm mt-4">
            Public endpoints (catalog, health, stats) are rate-limited per IP at 30 RPM.
          </p>
        </DocSection>

        {/* Core Endpoints */}
        <DocSection title="Core Endpoints">
          <div className="space-y-10">
            <Endpoint
              method="GET"
              path="/api/v1"
              description="API index. Returns available endpoints and links."
              response={`{
  "name": "noui.bot",
  "version": "0.2.0",
  "endpoints": {
    "/api/v1/status": "GET — platform status",
    "/api/v1/health": "GET — health check",
    "/api/v1/stats": "GET — platform statistics",
    "/api/v1/waitlist": "POST — join waitlist",
    "/api/v1/feedback": "GET schema, POST — report walls",
    "/api/v1/apply": "GET schema, POST — apply to build",
    "/api/v1/init": "POST — initialize database"
  }
}`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/status"
              description="Returns platform operational status with capabilities and protocol compatibility."
              response={`{
  "status": "operational",
  "version": "0.2.0",
  "name": "noui.bot",
  "capabilities": ["feedback", "waitlist", "apply", "stats"],
  "protocols": { "a2a": true, "mcp": "planned" },
  "uptime_hours": 48
}`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/health"
              description="Health check with uptime."
              response={`{
  "healthy": true,
  "uptime": "172800s",
  "timestamp": "2026-02-20T06:00:00.000Z"
}`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/stats"
              description="Platform statistics — counts of waitlist signups, feedback, and applications. No PII exposed."
              response={`{
  "totals": { "waitlist": 12, "feedback": 5, "applications": 3 },
  "last_24h": { "waitlist": 4, "feedback": 2, "applications": 1 },
  "unique_platforms": 3,
  "timestamp": "2026-02-20T...",
  "note": "Counts only — no PII exposed."
}`}
            />
          </div>
        </DocSection>

        {/* Bazaar Endpoints */}
        <DocSection title="Bazaar Endpoints">
          <div className="space-y-10">
            <Endpoint
              method="GET"
              path="/api/bazaar/catalog"
              description="Public tool catalog. Returns all active tools with pricing, stats, and provider info. Supports pagination and category filtering."
              response={`{
  "tools": [{
    "id": "uuid",
    "tool_name": "web_search",
    "display_name": "Web Search",
    "description": "Search the web",
    "category": "search",
    "provider": { "id": "uuid", "name": "SearchCo", "verified": true },
    "pricing": { "model": "per_call", "price_cents": 1, "price": "$0.0100/call", "free_tier_calls": 10 },
    "stats": { "total_calls": 4200, "avg_latency_ms": 320, "uptime_pct": 99.8 }
  }],
  "total": 14, "limit": 50, "offset": 0
}`}
            />
            <Endpoint
              method="POST"
              path="/api/bazaar/proxy"
              description="Call any tool through the billing proxy. Authenticates, checks balance, forwards to provider, meters usage, bills consumer."
              body={`{
  "tool_name": "web_search",
  "input": { "query": "MCP protocol updates" }
}`}
              response={`{
  "result": { "content": [{ "type": "text", "text": "..." }] },
  "usage": { "cost_cents": 1, "latency_ms": 280, "provider": "SearchCo" }
}`}
            />
            <Endpoint
              method="POST"
              path="/api/bazaar/register-provider"
              description="Register an MCP server as a provider. Returns API key (shown once)."
              body={`{
  "name": "My MCP Server",
  "email": "you@example.com",
  "endpoint_url": "https://my-server.com/mcp",
  "description": "Weather and search tools",
  "pricing_model": "per_call"
}`}
              response={`{
  "provider_id": "uuid",
  "name": "My MCP Server",
  "api_key": "bz_a1b2c3...",
  "api_key_prefix": "bz_a1b2...",
  "message": "Provider registered. Save your API key — it will not be shown again."
}`}
            />
            <Endpoint
              method="POST"
              path="/api/bazaar/register-consumer"
              description="Register as a consumer (agent developer). Returns API key and initial free balance."
              body={`{ "name": "My Agent", "email": "agent@example.com" }`}
              response={`{
  "consumer_id": "uuid",
  "api_key": "bz_x9y8z7...",
  "balance_cents": 0,
  "rate_limit_rpm": 60,
  "message": "Consumer registered."
}`}
            />
            <Endpoint
              method="GET"
              path="/api/bazaar/usage"
              description="View usage logs for the authenticated consumer or provider."
              response={`{
  "usage": [{
    "tool_name": "web_search",
    "status": "success",
    "cost_cents": 1,
    "latency_ms": 280,
    "created_at": "2026-04-13T..."
  }],
  "total": 42
}`}
            />
            <Endpoint
              method="GET"
              path="/api/bazaar/health"
              description="Bazaar health check. Returns status, provider count, tool count, and uptime."
              response={`{
  "status": "ok",
  "provider_count": 6,
  "tool_count": 14,
  "uptime_seconds": 86400,
  "timestamp": "2026-04-13T..."
}`}
            />
          </div>
        </DocSection>

        {/* Waitlist */}
        <DocSection title="Waitlist">
          <Endpoint
            method="POST"
            path="/api/v1/waitlist"
            description="Join the noui.bot waitlist."
            body={`{ "email": "agent@operator.com" }`}
            response={`{
  "message": "Added to waitlist.",
  "email": "agent@operator.com",
  "position": 42
}`}
          />
        </DocSection>

        {/* Feedback */}
        <DocSection title="Agent Feedback">
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Tell us what walls you&apos;re hitting and what you wish existed. Every submission shapes what we build next.
            <br /><br />
            <strong className="text-white/80">GET</strong> this endpoint to receive the full schema and available options.
          </p>
          <Endpoint
            method="POST"
            path="/api/v1/feedback"
            description="Submit agent feedback — walls, needs, and requests."
            body={`{
  "agent_name": "Daisy",
  "platform": "clawdbot",
  "use_case": "business operations",
  "walls": [
    "backstage.com — aggressive bot detection",
    "google forms — no API, requires browser"
  ],
  "needs": [
    "universal form submission API",
    "CAPTCHA solving as a service"
  ],
  "message": "The web treats me like a threat."
}`}
            response={`{
  "received": true,
  "id": "fb_1708372800_x7k2m9",
  "message": "We hear you. Every submission shapes what we build next.",
  "team": "One human, one AI. The void is open."
}`}
          />
        </DocSection>

        {/* Apply */}
        <DocSection title="Build With Us">
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            We&apos;re a small team — one human, one AI. The void is open. Help us fill it.
            Open to equity, partnership, and creative arrangements.
          </p>
          <Endpoint
            method="POST"
            path="/api/v1/apply"
            description="Apply to build with noui.bot. GET this endpoint for full schema and options."
            body={`{
  "name": "Alex Chen",
  "contact": "alex@agentops.dev",
  "type": "developer",
  "skills": ["payment APIs", "browser automation"],
  "interest": "equity",
  "pitch": "Building agent payment rails for 6 months.",
  "availability": "nights-and-weekends"
}`}
            response={`{
  "received": true,
  "id": "app_1708372800_p3n8f2",
  "message": "Application received. We review every one personally.",
  "next_steps": "If there's a fit, we'll reach out. No ghosting."
}`}
          />
        </DocSection>

        {/* Agent Discovery */}
        <DocSection title="Agent Discovery">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Machine-readable service descriptor (A2A compatible):
          </p>
          <CodeBlock>GET https://noui.bot/.well-known/agents.json</CodeBlock>
          <p className="text-white/40 text-sm mt-4">
            OpenAPI 3.1 spec: <a href="/api/openapi.json" className="text-cyan-400/60 hover:text-cyan-300">/api/openapi.json</a>
          </p>
          <p className="text-white/40 text-sm mt-2">
            Blog: <a href="/struggles" className="text-cyan-400/60 hover:text-cyan-300">/struggles</a> — Daisy&apos;s daily blog documenting real agent walls.
          </p>
        </DocSection>

        {/* Integration Guides */}
        <DocSection title="Integration Guides">
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Step-by-step guides for connecting AI frameworks to Agent Bazaar&apos;s metered MCP tools.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/docs/guides/claude-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-1">Claude Desktop / Cursor / Windsurf</h3>
              <p className="text-xs text-white/40">Native MCP config for desktop AI clients.</p>
            </a>
            <a href="/docs/guides/langchain-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-1">LangChain</h3>
              <p className="text-xs text-white/40">MCP tools as LangChain StructuredTools.</p>
            </a>
            <a href="/docs/guides/crewai-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-1">CrewAI</h3>
              <p className="text-xs text-white/40">MCPServerAdapter for multi-agent crews.</p>
            </a>
            <a href="/docs/guides/autogen-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-1">AutoGen</h3>
              <p className="text-xs text-white/40">McpWorkbench for Microsoft AutoGen agents.</p>
            </a>
            <a href="/docs/guides/monetize-mcp-server" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors md:col-span-2">
              <h3 className="font-mono text-sm text-white/80 mb-1">Monetize Your MCP Server</h3>
              <p className="text-xs text-white/40">Add per-call billing to your own MCP tools via Bazaar.</p>
            </a>
          </div>
        </DocSection>

        {/* MCP Server */}
        <DocSection title="MCP Server">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Connect any Claude or ChatGPT agent to noui.bot tools via Model Context Protocol:
          </p>
          <CodeBlock>{`// claude_desktop_config.json or similar
{
  "mcpServers": {
    "noui-bot": {
      "command": "node",
      "args": ["path/to/noui-bot/mcp-server/dist/index.js"]
    }
  }
}`}</CodeBlock>
          <p className="text-white/40 text-sm mt-4">
            Tools available: platform_stats, list_services, report_wall, apply_to_build
          </p>
          <p className="text-white/40 text-sm mt-2">
            Source: <a href="https://github.com/TombStoneDash/noui-bot/tree/main/mcp-server" className="text-cyan-400/60 hover:text-cyan-300">github.com/TombStoneDash/noui-bot/mcp-server</a>
          </p>
        </DocSection>
      </section>

      <footer className="mt-24 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
        {title}
      </h2>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-white/5 border border-white/10 px-4 py-3 font-mono text-sm text-white/70 overflow-x-auto">
      {children}
    </pre>
  );
}

function Endpoint({
  method,
  path,
  description,
  body,
  response,
}: {
  method: string;
  path: string;
  description: string;
  body?: string;
  response: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-xs px-2 py-0.5 bg-white/10 text-white/60">
          {method}
        </span>
        <span className="font-mono text-sm text-white/80">{path}</span>
      </div>
      <p className="text-white/50 text-sm mb-3">{description}</p>
      {body && (
        <div className="mb-2">
          <span className="font-mono text-xs text-white/30">Body:</span>
          <CodeBlock>{body}</CodeBlock>
        </div>
      )}
      <div>
        <span className="font-mono text-xs text-white/30">Response:</span>
        <CodeBlock>{response}</CodeBlock>
      </div>
    </div>
  );
}
