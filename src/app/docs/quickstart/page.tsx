import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quickstart — Agent Bazaar | noui.bot",
  description:
    "Get your first metered MCP tool call in 5 minutes. Register, get an API key, and start calling tools.",
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-4">
      {title && (
        <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">
          {title}
        </div>
      )}
      <pre className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4 overflow-x-auto">
        <code className="font-mono text-sm text-white/70 whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-12 pb-12 border-l border-white/[0.08] ml-4">
      <div className="absolute -left-4 top-0 w-8 h-8 bg-white/[0.05] border border-white/[0.1] rounded-full flex items-center justify-center font-mono text-xs text-white/60">
        {number}
      </div>
      <h3 className="font-mono text-base font-bold mb-3 -mt-0.5">{title}</h3>
      <div className="text-sm text-white/50 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        ← docs
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
        Quickstart
      </h1>
      <p className="text-white/40 font-mono text-sm mb-4">
        First metered MCP tool call in 5 minutes.
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full text-xs text-white/40 font-mono mb-12">
        <span>⏱</span> ~5 minutes
      </div>

      <div className="space-y-0">
        <Step number={1} title="Get an API key">
          <p>
            Register as a consumer to get your API key. This takes 30 seconds.
          </p>
          <CodeBlock title="Via API">{`curl -X POST https://noui.bot/api/bazaar/register-consumer \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Agent",
    "email": "you@example.com"
  }'`}</CodeBlock>
          <p>
            Or use the{" "}
            <a
              href="/developers/register"
              className="text-white/70 underline underline-offset-4 hover:text-white transition-colors"
            >
              web registration form
            </a>
            .
          </p>
          <p className="text-white/30 text-xs">
            You&apos;ll get a key like{" "}
            <code className="bg-white/5 px-1 rounded">bz_live_abc123...</code>
            — save it, it won&apos;t be shown again.
          </p>
        </Step>

        <Step number={2} title="Browse the catalog">
          <p>See what tools are available:</p>
          <CodeBlock>{`curl https://noui.bot/api/bazaar/catalog | jq '.tools[] | {name: .display_name, price: .pricing.price}'`}</CodeBlock>
          <p>
            Or browse visually at{" "}
            <a
              href="/marketplace"
              className="text-white/70 underline underline-offset-4 hover:text-white transition-colors"
            >
              /marketplace
            </a>
            .
          </p>
        </Step>

        <Step number={3} title="Make your first call">
          <p>Call any tool through the Bazaar proxy:</p>
          <CodeBlock title="Proxy a tool call">{`curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer bz_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool_name": "weather_forecast",
    "input": {
      "location": "San Francisco, CA"
    }
  }'`}</CodeBlock>
          <p>
            The Bazaar authenticates you, meters the call, proxies it to the
            provider, and returns the result. If the tool costs money, it&apos;s
            deducted from your balance.
          </p>
        </Step>

        <Step number={4} title="Check your usage">
          <p>See what you&apos;ve used and what it cost:</p>
          <CodeBlock>{`curl https://noui.bot/api/bazaar/usage/summary \\
  -H "Authorization: Bearer bz_live_your_key_here" | jq`}</CodeBlock>
          <p>
            Or visit your{" "}
            <a
              href="/developers/dashboard"
              className="text-white/70 underline underline-offset-4 hover:text-white transition-colors"
            >
              dashboard
            </a>
            .
          </p>
        </Step>

        <Step number={5} title="Load balance (for paid tools)">
          <p>
            Free tools work immediately. For paid tools, load your prepaid
            balance:
          </p>
          <CodeBlock>{`curl -X POST https://noui.bot/api/bazaar/balance/load \\
  -H "Authorization: Bearer bz_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"amount_cents": 500}'`}</CodeBlock>
          <p className="text-white/30 text-xs">
            $5.00 minimum. Returns a Stripe Checkout URL. Your balance is
            available instantly after payment.
          </p>
        </Step>
      </div>

      {/* SDK section */}
      <div className="mt-8 mb-16">
        <h2 className="font-mono text-lg font-bold mb-4">
          Using the TypeScript SDK
        </h2>
        <CodeBlock title="Install">{`npm install @forthebots/bazaar-sdk`}</CodeBlock>
        <CodeBlock title="Usage">{`import { BazaarClient } from '@forthebots/bazaar-sdk';

const bazaar = new BazaarClient({
  apiKey: 'bz_live_your_key_here'
});

// List available tools
const catalog = await bazaar.catalog();

// Call a tool
const result = await bazaar.call('weather_forecast', {
  location: 'San Francisco, CA'
});

// Check usage
const usage = await bazaar.usage();
console.log(\`Total calls: \${usage.total_calls}\`);
console.log(\`Total cost: $\${(usage.total_cost_cents / 100).toFixed(2)}\`);`}</CodeBlock>
      </div>

      {/* Integration guides */}
      <div className="mb-16">
        <h2 className="font-mono text-lg font-bold mb-4">
          Framework Guides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "Claude / Anthropic", href: "/docs/guides/claude-setup" },
            { name: "LangChain", href: "/docs/guides/langchain-setup" },
            { name: "CrewAI", href: "/docs/guides/crewai-setup" },
            { name: "AutoGen", href: "/docs/guides/autogen-setup" },
            {
              name: "Monetize Your Server",
              href: "/docs/guides/monetize-mcp-server",
            },
          ].map((guide) => (
            <a
              key={guide.href}
              href={guide.href}
              className="flex items-center justify-between p-3 border border-white/[0.06] rounded hover:border-white/[0.12] transition-colors group"
            >
              <span className="font-mono text-sm text-white/60 group-hover:text-white transition-colors">
                {guide.name}
              </span>
              <span className="text-white/20 group-hover:text-white/40 transition-colors">
                →
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Next steps */}
      <div className="border-t border-white/[0.06] pt-8">
        <h2 className="font-mono text-sm text-white/40 uppercase tracking-wider mb-4">
          Next steps
        </h2>
        <ul className="space-y-2 text-sm text-white/50">
          <li>
            →{" "}
            <a
              href="/providers/register"
              className="text-white/70 underline underline-offset-4 hover:text-white"
            >
              List your own MCP server
            </a>{" "}
            and start earning
          </li>
          <li>
            →{" "}
            <a
              href="/docs/bazaar"
              className="text-white/70 underline underline-offset-4 hover:text-white"
            >
              Full API reference
            </a>{" "}
            for all endpoints
          </li>
          <li>
            →{" "}
            <a
              href="/specs/mcp-billing-v1"
              className="text-white/70 underline underline-offset-4 hover:text-white"
            >
              Read the billing spec
            </a>{" "}
            (MIT licensed)
          </li>
          <li>
            →{" "}
            <a
              href="/pricing"
              className="text-white/70 underline underline-offset-4 hover:text-white"
            >
              Pricing details
            </a>{" "}
            for providers and consumers
          </li>
        </ul>
      </div>
    </div>
  );
}
