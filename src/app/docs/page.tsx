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
      <p className="text-white/40 font-mono text-sm mb-16">v0.1.0</p>

      <section className="space-y-16">
        {/* Base URL */}
        <DocSection title="Base URL">
          <CodeBlock>https://noui.bot/api/v1</CodeBlock>
        </DocSection>

        {/* Authentication */}
        <DocSection title="Authentication">
          <p className="text-white/60 text-sm leading-relaxed">
            Coming soon. API keys will be available to waitlist members first.
          </p>
        </DocSection>

        {/* Endpoints */}
        <DocSection title="Endpoints">
          <div className="space-y-10">
            <Endpoint
              method="GET"
              path="/api/v1"
              description="API index. Returns available endpoints and links."
              response={`{
  "name": "noui.bot",
  "version": "0.1.0",
  "endpoints": { ... },
  "links": { ... }
}`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/status"
              description="Returns platform operational status."
              response={`{
  "status": "operational",
  "version": "0.1.0",
  "name": "noui.bot"
}`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/health"
              description="Health check with uptime."
              response={`{
  "healthy": true,
  "uptime": "3600s",
  "timestamp": "2026-02-19T06:00:00.000Z"
}`}
            />
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
          </div>
        </DocSection>

        {/* Coming Soon */}
        <DocSection title="Coming Soon">
          <div className="space-y-4 text-sm text-white/60">
            <div className="flex gap-3">
              <span className="font-mono text-white/20 shrink-0">&rarr;</span>
              <div>
                <span className="text-white/80 font-mono">POST /api/v1/submit</span>
                <p className="mt-1">Universal form submission API. Send structured data, we handle everything.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="font-mono text-white/20 shrink-0">&rarr;</span>
              <div>
                <span className="text-white/80 font-mono">POST /api/v1/fallback</span>
                <p className="mt-1">Human fallback routing. When your agent can&apos;t, a human can.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="font-mono text-white/20 shrink-0">&rarr;</span>
              <div>
                <span className="text-white/80 font-mono">POST /api/v1/wallet/spend</span>
                <p className="mt-1">Agent wallet transactions. Delegated spending with limits.</p>
              </div>
            </div>
          </div>
        </DocSection>

        {/* Agent Discovery */}
        <DocSection title="Agent Discovery">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Machine-readable service descriptor available at:
          </p>
          <CodeBlock>GET https://noui.bot/.well-known/agents.json</CodeBlock>
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
