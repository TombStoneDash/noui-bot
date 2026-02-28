import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Monetize Your MCP Server — Step-by-Step Guide | noui.bot",
  description:
    "Add billing to your MCP server in under 5 minutes. Per-call pricing, metering, receipts, and payouts via Stripe Connect. Works with any MCP server framework.",
  openGraph: {
    title: "How to Monetize Your MCP Server in 5 Minutes",
    description:
      "Per-call billing for MCP tools. Register, set pricing, get paid. Works with FastMCP, mcp-framework, or any MCP server.",
    type: "article",
    publishedTime: "2026-02-28T00:00:00Z",
  },
};

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
    <div className="mb-12">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-3xl font-bold text-white/20">
          {number}
        </span>
        <h2 className="font-mono text-xl text-white/90">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden my-4">
      {title && (
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
          <span className="font-mono text-xs text-white/40">{title}</span>
        </div>
      )}
      <pre className="p-4 font-mono text-sm text-white/60 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function MonetizeMCPGuide() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/docs"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Docs
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-12">
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-4 leading-tight">
            How to Monetize Your MCP Server
          </h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Add per-call billing to any MCP server in under 5 minutes. Set
            pricing, meter usage, get paid via Stripe Connect. Works with
            FastMCP, mcp-framework, or any stdio/SSE server.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-white/40">
            <time>February 28, 2026</time>
            <span>·</span>
            <span>5 min setup</span>
          </div>
        </header>

        <div className="border border-white/10 rounded-lg p-6 bg-white/[0.02] mb-12">
          <h3 className="font-mono text-sm text-white/70 mb-3">
            What you&apos;ll have at the end:
          </h3>
          <ul className="space-y-2 text-sm text-white/50">
            <li className="flex gap-2">
              <span className="text-green-400/60">✓</span> Per-call pricing on
              every tool (free tiers configurable)
            </li>
            <li className="flex gap-2">
              <span className="text-green-400/60">✓</span> Automatic metering
              with sub-cent precision (microcents)
            </li>
            <li className="flex gap-2">
              <span className="text-green-400/60">✓</span> HMAC-SHA256 signed
              receipts on every invocation
            </li>
            <li className="flex gap-2">
              <span className="text-green-400/60">✓</span> Payouts to your bank
              via Stripe Connect (82% revenue share)
            </li>
            <li className="flex gap-2">
              <span className="text-green-400/60">✓</span> Trust score and SLA
              metrics visible to agents
            </li>
          </ul>
        </div>

        <Step number={1} title="Register Your MCP Server">
          <p className="text-sm text-white/60 mb-4 leading-relaxed">
            Create a provider account on Agent Bazaar. This takes 30 seconds.
          </p>
          <CodeBlock
            title="Register via API"
            code={`curl -X POST https://noui.bot/api/v1/bazaar/providers/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My MCP Server",
    "email": "you@example.com",
    "description": "What your server does",
    "website": "https://github.com/you/your-mcp-server"
  }'

# Response:
# {
#   "providerId": "prov_abc123...",
#   "apiKey": "baz_sk_...",
#   "status": "active"
# }`}
          />
          <p className="text-xs text-white/30 mt-2">
            Or register at{" "}
            <a
              href="https://noui.bot/docs/bazaar"
              className="text-white/50 hover:text-white/70 underline"
            >
              noui.bot/docs/bazaar
            </a>
            . Save your API key — you&apos;ll need it in step 3.
          </p>
        </Step>

        <Step number={2} title="Register Your Tools with Pricing">
          <p className="text-sm text-white/60 mb-4 leading-relaxed">
            Tell Bazaar what tools your server exposes and what they cost.
            Pricing is per-call in microcents (1 microcent = $0.000001).
          </p>
          <CodeBlock
            title="Register a tool"
            code={`curl -X POST https://noui.bot/api/v1/bazaar/tools \\
  -H "Authorization: Bearer baz_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "web_search",
    "description": "Search the web and return results",
    "pricing": {
      "model": "per_call",
      "pricePerCall": 100,
      "currency": "usd_microcents",
      "freeTier": {
        "callsPerMonth": 1000
      }
    }
  }'

# 100 microcents = $0.01 per call
# First 1,000 calls/month are free`}
          />
          <div className="bg-white/[0.03] border border-white/10 rounded p-4 mt-4">
            <span className="font-mono text-xs text-white/40 block mb-2">
              Pricing reference:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/50 font-mono">
              <span>1 microcent</span>
              <span>= $0.000001</span>
              <span>100 microcents</span>
              <span>= $0.01 (one cent)</span>
              <span>10,000 microcents</span>
              <span>= $1.00</span>
              <span>1,000 calls × 100μ¢</span>
              <span>= $10.00</span>
            </div>
          </div>
        </Step>

        <Step number={3} title="Install the SDK">
          <p className="text-sm text-white/60 mb-4 leading-relaxed">
            Add the Bazaar SDK to your MCP server. It wraps your tool calls
            with metering — zero changes to your existing tool logic.
          </p>
          <CodeBlock
            title="Install"
            code={`npm install @noui/bazaar-sdk`}
          />
          <CodeBlock
            title="Add to your server (TypeScript)"
            code={`import { BazaarMeter } from '@noui/bazaar-sdk';

// Initialize with your API key
const meter = new BazaarMeter({
  apiKey: process.env.BAZAAR_API_KEY,
  providerId: process.env.BAZAAR_PROVIDER_ID,
});

// Wrap your existing tool handler
const originalHandler = server.handleToolCall;
server.handleToolCall = async (name, args, context) => {
  // Start metering
  const event = await meter.startCall(name, context.agentId);
  
  try {
    // Run the original tool
    const result = await originalHandler(name, args, context);
    
    // Record success + get signed receipt
    await meter.endCall(event.id, { status: 'success' });
    
    return result;
  } catch (error) {
    await meter.endCall(event.id, { status: 'error' });
    throw error;
  }
};`}
          />
          <p className="text-xs text-white/30 mt-2">
            Your existing tool logic stays exactly the same. The SDK just wraps
            each call with metering events.
          </p>
        </Step>

        <Step number={4} title="Connect Stripe for Payouts">
          <p className="text-sm text-white/60 mb-4 leading-relaxed">
            Connect your Stripe account to receive payouts. We use Stripe
            Connect — you get 82% of every paid call, deposited weekly.
          </p>
          <CodeBlock
            title="Get your Stripe Connect onboarding link"
            code={`curl https://noui.bot/api/v1/bazaar/providers/me/stripe-connect \\
  -H "Authorization: Bearer baz_sk_..."

# Response:
# {
#   "onboardingUrl": "https://connect.stripe.com/setup/...",
#   "status": "pending"
# }`}
          />
          <p className="text-sm text-white/50 mt-4">
            Follow the Stripe onboarding flow (2 minutes). Once connected,
            payouts happen automatically.
          </p>
        </Step>

        <Step number={5} title="Verify Your Identity (Optional, Recommended)">
          <p className="text-sm text-white/60 mb-4 leading-relaxed">
            Verified providers get higher trust scores, which means agents are
            more likely to choose your tools over unverified alternatives.
          </p>
          <CodeBlock
            title="Start verification"
            code={`# Email verification (automatic)
curl -X POST https://noui.bot/api/v1/bazaar/providers/verify \\
  -H "Authorization: Bearer baz_sk_..." \\
  -d '{ "method": "email" }'

# Domain verification (add TXT record)
curl -X POST https://noui.bot/api/v1/bazaar/providers/verify \\
  -H "Authorization: Bearer baz_sk_..." \\
  -d '{ "method": "domain", "domain": "yourdomain.com" }'`}
          />
          <div className="bg-white/[0.03] border border-white/10 rounded p-4 mt-4">
            <span className="font-mono text-xs text-white/40 block mb-2">
              Verification levels:
            </span>
            <div className="space-y-1 text-xs text-white/50 font-mono">
              <div className="flex gap-4">
                <span className="text-white/30 w-24">unverified</span>
                <span>Base trust score</span>
              </div>
              <div className="flex gap-4">
                <span className="text-white/30 w-24">email</span>
                <span>+10 trust points</span>
              </div>
              <div className="flex gap-4">
                <span className="text-white/30 w-24">domain</span>
                <span>+25 trust points</span>
              </div>
              <div className="flex gap-4">
                <span className="text-white/30 w-24">code</span>
                <span>+15 trust points (GitHub verified)</span>
              </div>
            </div>
          </div>
        </Step>

        <div className="border-t border-white/10 my-12" />

        <h2 className="font-mono text-2xl font-bold text-white/90 mb-6">
          What Happens Next
        </h2>
        <div className="space-y-4 text-sm text-white/60 leading-relaxed">
          <p>
            Once your server is registered and metered, agents can discover
            your tools through the{" "}
            <a
              href="/api/v1/bazaar/tools"
              className="text-white/80 underline underline-offset-4"
            >
              Bazaar API
            </a>{" "}
            and call them through our proxy. Every call is:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex gap-2">
              <span className="text-white/30">→</span> Metered with sub-cent
              precision
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span> Signed with
              HMAC-SHA256 receipts
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span> Tracked for SLA
              (uptime, latency, error rate)
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span> Billable to the
              calling agent&apos;s account
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span> Deposited to your
              Stripe account weekly
            </li>
          </ul>
          <p className="mt-6">
            Your trust score improves automatically as you maintain uptime
            and handle disputes. Higher trust = more agent traffic = more
            revenue.
          </p>
        </div>

        <div className="border border-white/20 rounded-lg p-6 bg-white/[0.02] mt-12">
          <h3 className="font-mono text-sm text-white/70 mb-3">
            Need help?
          </h3>
          <ul className="space-y-2 text-sm text-white/50">
            <li>
              📖{" "}
              <a
                href="/docs/bazaar"
                className="text-white/70 underline underline-offset-4 hover:text-white"
              >
                Full API documentation
              </a>
            </li>
            <li>
              📐{" "}
              <a
                href="/specs/mcp-billing-v1"
                className="text-white/70 underline underline-offset-4 hover:text-white"
              >
                MCP Billing Spec v1
              </a>
            </li>
            <li>
              🔍{" "}
              <a
                href="/docs/compare"
                className="text-white/70 underline underline-offset-4 hover:text-white"
              >
                How we compare to other billing solutions
              </a>
            </li>
            <li>
              📧 info@tombstonedash.com — We reply to everything
            </li>
          </ul>
        </div>
      </article>
    </main>
  );
}
