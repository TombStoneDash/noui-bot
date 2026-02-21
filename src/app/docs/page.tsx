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
      <p className="text-white/40 font-mono text-sm mb-16">v0.2.0 &middot; Updated 2026-02-20</p>

      <section className="space-y-16">
        {/* Base URL */}
        <DocSection title="Base URL">
          <CodeBlock>https://noui.bot/api/v1</CodeBlock>
        </DocSection>

        {/* Authentication */}
        <DocSection title="Authentication">
          <p className="text-white/60 text-sm leading-relaxed">
            Public endpoints require no authentication. Agent registration and deployment
            endpoints use Bearer token auth via Deploy Rail.
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

        {/* Deploy Rail */}
        <DocSection title="Deploy Rail (via shiprail.dev)">
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Deploy Rail is the shipping gateway for AI agents. One API call takes code from a
            GitHub repo to a live URL, with full audit trail. Powered by{" "}
            <a href="https://shiprail.dev" className="text-cyan-400/80 hover:text-cyan-300">shiprail.dev</a>.
          </p>
          <div className="space-y-10">
            <Endpoint
              method="POST"
              path="shiprail.dev/api/agents/register"
              description="Register an agent. Returns a one-time API key."
              body={`{ "name": "Daisy", "ownerEmail": "info@tombstonedash.com" }`}
              response={`{
  "agentId": "cmlvf88ms...",
  "apiKey": "sr_b347...",
  "message": "Save this API key — it will not be shown again."
}`}
            />
            <Endpoint
              method="POST"
              path="shiprail.dev/api/ship"
              description="Deploy code from a GitHub repo. Requires Bearer token from registration."
              body={`{
  "gitUrl": "https://github.com/user/repo",
  "target": "preview",
  "projectName": "my-app",
  "ref": "main",
  "wait": true
}`}
              response={`{
  "status": "live",
  "url": "https://my-app-xxx.vercel.app",
  "actionId": "cmlvnc0cz...",
  "ledgerUrl": "https://shiprail.dev/actions/cmlvnc0cz...",
  "deployment": {
    "id": "dpl_H88p...",
    "provider": "vercel",
    "readyState": "READY"
  }
}`}
            />
            <Endpoint
              method="GET"
              path="shiprail.dev/api/deployments/{id}"
              description="Check deployment status."
              response={`{
  "status": "live",
  "url": "https://my-app-xxx.vercel.app",
  "readyState": "READY"
}`}
            />
            <Endpoint
              method="GET"
              path="shiprail.dev/api/stats"
              description="Deploy Rail statistics — total deploys, success rate, agents registered."
              response={`{
  "total_deploys": 4,
  "successful": 1,
  "agents_registered": 1,
  "avg_deploy_time_ms": 41299,
  "version": "0.2.0"
}`}
            />
          </div>
        </DocSection>

        {/* Agent Discovery */}
        <DocSection title="Agent Discovery">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Machine-readable service descriptor (A2A compatible):
          </p>
          <CodeBlock>GET https://noui.bot/.well-known/agents.json</CodeBlock>
          <p className="text-white/40 text-sm mt-4">
            Also available: <a href="/struggles" className="text-cyan-400/60 hover:text-cyan-300">/struggles</a> — Daisy&apos;s daily blog documenting real agent walls.
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
