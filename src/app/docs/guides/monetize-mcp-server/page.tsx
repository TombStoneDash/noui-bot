import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monetize Your MCP Server — TypeScript Example | noui.bot",
  description:
    "Copy-paste TypeScript code to add billing to any MCP server. Register, list tools, and start earning in under 10 minutes.",
};

export default function MonetizeMCPServerPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">
        Monetize Your MCP Server
      </h1>
      <p className="text-white/40 font-mono text-sm mb-4">
        TypeScript integration guide — add billing to any existing MCP server.
      </p>
      <p className="text-white/30 font-mono text-xs mb-16">
        Estimated time: 10 minutes · No code changes to your MCP server required
      </p>

      <div className="space-y-12">
        <Section title="Overview">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Agent Bazaar acts as a billing proxy in front of your existing MCP server.
            Your server continues to work exactly as it does today — we just meter the calls
            and handle payments.
          </p>
          <Code>{`┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  AI Agent   │────▶│ Agent Bazaar │────▶│ Your MCP Server  │
│  (consumer) │◀────│   (proxy)    │◀────│   (unchanged)    │
└─────────────┘     └──────────────┘     └──────────────────┘
                    │ meters calls  │
                    │ signs receipts│
                    │ handles billing│`}</Code>
        </Section>

        <Section title="Step 1: Install the SDK">
          <Code>{`npm install @noui/bazaar-sdk
# or
yarn add @noui/bazaar-sdk
# or
pnpm add @noui/bazaar-sdk`}</Code>
        </Section>

        <Section title="Step 2: Register as a Provider">
          <Code>{`// register-provider.ts
import { BazaarClient } from '@noui/bazaar-sdk';

const bazaar = new BazaarClient({
  baseUrl: 'https://noui.bot/api/v1',
});

async function register() {
  const result = await bazaar.registerProvider({
    name: 'my-awesome-mcp',
    displayName: 'My Awesome MCP Server',
    description: 'Does amazing things with AI',
    mcpServerUrl: 'https://my-server.com/mcp',
    contact: 'developer@example.com',
  });

  console.log('Provider ID:', result.providerId);
  console.log('API Key:', result.apiKey);
  // Save this API key! You'll need it for all operations.
}

register();`}</Code>
          <p className="text-white/50 text-xs mt-2">
            Run once: <code className="text-white/70">npx tsx register-provider.ts</code>
          </p>
        </Section>

        <Section title="Step 3: List Your Tools with Pricing">
          <Code>{`// list-tools.ts
import { BazaarClient } from '@noui/bazaar-sdk';

const bazaar = new BazaarClient({
  baseUrl: 'https://noui.bot/api/v1',
  apiKey: 'baz_sk_your_key_here', // from Step 2
});

async function listTools() {
  await bazaar.listTools({
    tools: [
      {
        name: 'search',
        description: 'Search documents by query',
        pricePerCall: 0.01, // $0.01 per search
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Max results', default: 10 },
          },
          required: ['query'],
        },
      },
      {
        name: 'analyze',
        description: 'Deep analysis of a document',
        pricePerCall: 0.05, // $0.05 per analysis
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            depth: { type: 'string', enum: ['summary', 'detailed', 'exhaustive'] },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'list_recent',
        description: 'List recently added documents',
        pricePerCall: 0, // FREE — great for discovery
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
          },
        },
      },
    ],
  });

  console.log('Tools listed! They\\'re now discoverable on Agent Bazaar.');
}

listTools();`}</Code>
          <div className="mt-4 bg-white/5 border border-white/10 p-3 text-xs text-white/50">
            <strong className="text-white/70">Pro tip:</strong> Mix free and paid tools.
            Free tools drive discovery; paid tools drive revenue.
            A common pattern: free list/search, paid deep analysis.
          </div>
        </Section>

        <Section title="Step 4: Verify Your Identity">
          <Code>{`// verify.ts
import { BazaarClient } from '@noui/bazaar-sdk';

const bazaar = new BazaarClient({
  baseUrl: 'https://noui.bot/api/v1',
  apiKey: 'baz_sk_your_key_here',
});

async function verify() {
  // Start email verification
  await bazaar.startVerification({ method: 'email' });
  console.log('Check your email for a verification code.');

  // After receiving the code:
  await bazaar.completeVerification({
    method: 'email',
    code: 'YOUR_CODE_HERE',
  });
  console.log('Verified! You now have a trust badge.');
}

verify();`}</Code>
        </Section>

        <Section title="Step 5: Monitor Earnings">
          <Code>{`// dashboard.ts
import { BazaarClient } from '@noui/bazaar-sdk';

const bazaar = new BazaarClient({
  baseUrl: 'https://noui.bot/api/v1',
  apiKey: 'baz_sk_your_key_here',
});

async function checkDashboard() {
  const trust = await bazaar.getTrustScore();
  console.log(\`
  Trust Score: \${trust.score}/100
  Badge: \${trust.badge}
  Total Calls: \${trust.totalCalls}
  Total Revenue: $\${trust.totalRevenue}
  Uptime: \${trust.sla.uptimePercent}%
  Avg Latency: \${trust.sla.avgLatencyMs}ms
  \`);
}

checkDashboard();`}</Code>
        </Section>

        <Section title="That's It!">
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Your MCP server is now listed on Agent Bazaar. AI agents can discover your tools
            in the catalog, call them through the proxy, and you earn 82% of every paid call.
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            <strong className="text-white/80">You changed zero lines of your MCP server code.</strong>{" "}
            Bazaar proxies calls to your existing endpoint. Your tools work exactly as before,
            but now they&apos;re metered and monetized.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <a
              href="/docs/guides/provider-quickstart"
              className="border border-white/10 p-4 hover:border-white/20 transition-colors"
            >
              <span className="font-mono text-xs text-white/40">Next</span>
              <p className="text-white/70 text-sm mt-1">Provider Quickstart &rarr;</p>
            </a>
            <a
              href="/docs/bazaar"
              className="border border-white/10 p-4 hover:border-white/20 transition-colors"
            >
              <span className="font-mono text-xs text-white/40">Reference</span>
              <p className="text-white/70 text-sm mt-1">Full API Docs &rarr;</p>
            </a>
          </div>
        </Section>
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
