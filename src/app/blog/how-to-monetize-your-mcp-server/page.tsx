import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "How to Monetize Your MCP Server in 5 Minutes | noui.bot",
  description:
    "Step-by-step tutorial: register on Agent Bazaar, wrap your MCP server with billing middleware, set pricing, and start earning from AI agent traffic. Copy-paste code included.",
  keywords: [
    "monetize MCP server",
    "MCP billing",
    "sell AI tools",
    "MCP server pricing",
    "agent marketplace",
    "MCP monetization",
    "AI tool marketplace",
  ],
  openGraph: {
    images: ["/og-image.jpg"],
    title: "How to Monetize Your MCP Server in 5 Minutes",
    description:
      "Turn your MCP server into a revenue stream. Register, wrap, price, earn. Full tutorial with code examples.",
    type: "article",
    publishedTime: "2026-02-28T00:00:00Z",
  },
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden my-6">
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="font-mono text-xs text-white/30">{language}</span>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="font-mono text-sm text-white/70 leading-relaxed whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

function StepHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mt-12 mb-4">
      <span className="font-mono text-3xl font-bold text-white/10">
        {number}
      </span>
      <h2 className="font-mono text-xl font-bold text-white/90">{title}</h2>
    </div>
  );
}

export default function MonetizeMCPServer() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/blog"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Blog
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-12">
          <div className="font-mono text-xs text-white/30 mb-4">
            February 28, 2026 &middot; 5 min read
          </div>
          <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight mb-4 leading-tight break-words">
            How to Monetize Your MCP Server in 5 Minutes
          </h1>
          <p className="text-lg text-white/50">
            You built an MCP server. Agents are calling it. But you&apos;re not
            earning a cent. Here&apos;s how to fix that — in under five minutes,
            with twelve lines of code.
          </p>
        </header>

        <div className="space-y-6 text-white/70 leading-relaxed">
          <p>
            The Model Context Protocol has over 10,000 servers. Most of them are
            free. Not &ldquo;freemium&rdquo; — just free. Developers build
            powerful tools, host them on their own infrastructure, pay for
            compute, and get nothing back.
          </p>

          <p>
            This isn&apos;t sustainable. And it&apos;s not how the rest of the
            software industry works. APIs have Stripe. SaaS has subscription
            billing. MCP servers have... nothing. Until now.
          </p>

          <p>
            <a
              href="/docs/bazaar"
              className="text-white underline underline-offset-4 hover:text-white/80"
            >
              Agent Bazaar
            </a>{" "}
            gives your MCP server a billing layer. Agents discover your tools,
            agree to your pricing, call your tools, and pay you — all through a
            standard protocol. No custom payment integration. No invoicing. No
            chasing down agent developers on Discord.
          </p>

          <p>Here&apos;s the full setup, step by step.</p>

          <StepHeader number={1} title="Install the Bazaar SDK" />

          <p>
            One package. Works with any Node.js MCP server built on the official{" "}
            <code className="font-mono text-sm bg-white/5 px-1.5 py-0.5 rounded">
              @modelcontextprotocol/sdk
            </code>{" "}
            package.
          </p>

          <CodeBlock language="bash" code="npm install @forthebots/bazaar-sdk" />

          <p>
            If you&apos;re using Python, the SDK supports the{" "}
            <code className="font-mono text-sm bg-white/5 px-1.5 py-0.5 rounded">
              mcp
            </code>{" "}
            Python package too:
          </p>

          <CodeBlock language="bash" code="pip install noui-bazaar" />

          <StepHeader number={2} title="Register on Agent Bazaar" />

          <p>
            Head to{" "}
            <a
              href="https://noui.bot/bazaar"
              className="text-white underline underline-offset-4 hover:text-white/80"
            >
              noui.bot/bazaar
            </a>{" "}
            and create a provider account. You&apos;ll get:
          </p>

          <ul className="list-none space-y-2 my-4">
            <li className="flex gap-3 items-start">
              <span className="text-white/30 mt-0.5">→</span>
              <span>
                A <strong className="text-white/90">provider ID</strong> — your
                unique identifier in the marketplace
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-white/30 mt-0.5">→</span>
              <span>
                An <strong className="text-white/90">API key</strong> — for
                authenticating billing events
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-white/30 mt-0.5">→</span>
              <span>
                A <strong className="text-white/90">trust profile</strong> —
                starts at &ldquo;unverified&rdquo; (you can verify your domain
                and email to boost your trust score)
              </span>
            </li>
          </ul>

          <p>
            Verification is optional but matters. Agents using noui.bot&apos;s
            trust layer will prefer verified providers. More trust → more
            traffic → more revenue.
          </p>

          <StepHeader number={3} title="Wrap Your MCP Server" />

          <p>
            This is the core step. You have an existing MCP server — a set of
            tools that agents call. The Bazaar SDK wraps it with billing
            middleware that meters every invocation, validates the caller&apos;s
            payment token, and emits signed receipts.
          </p>

          <CodeBlock
            language="typescript"
            code={`import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withBilling } from "@forthebots/bazaar-sdk";

const server = new McpServer({
  name: "my-weather-tools",
  version: "1.0.0",
});

// Your existing tool — nothing changes here
server.tool("get-forecast", { city: z.string() }, async ({ city }) => {
  const forecast = await fetchWeather(city);
  return { content: [{ type: "text", text: JSON.stringify(forecast) }] };
});

// Wrap with billing — one function call
const billedServer = withBilling(server, {
  providerId: process.env.BAZAAR_PROVIDER_ID,
  apiKey: process.env.BAZAAR_API_KEY,
  pricing: {
    "get-forecast": {
      model: "per-call",
      price: 0.001,     // $0.001 per call (one-tenth of a cent)
      currency: "USD",
    },
  },
});

billedServer.listen();`}
          />

          <p>
            That&apos;s it. Your server now meters every{" "}
            <code className="font-mono text-sm bg-white/5 px-1.5 py-0.5 rounded">
              get-forecast
            </code>{" "}
            call, validates that the calling agent has a valid payment session,
            and emits a signed receipt (HMAC-SHA256) for both parties.
          </p>

          <StepHeader number={4} title="Set Your Pricing" />

          <p>The SDK supports three pricing models out of the box:</p>

          <div className="border border-white/10 rounded-lg overflow-hidden my-6">
            <div className="grid grid-cols-3 gap-px bg-white/5">
              <div className="p-4 bg-black">
                <span className="font-mono text-xs text-white/40 block mb-2">
                  per-call
                </span>
                <p className="text-sm text-white/60">
                  Fixed price per tool invocation. Best for simple lookups and
                  fast operations.
                </p>
                <p className="font-mono text-xs text-white/30 mt-2">
                  e.g. $0.001/call
                </p>
              </div>
              <div className="p-4 bg-black">
                <span className="font-mono text-xs text-white/40 block mb-2">
                  per-token
                </span>
                <p className="text-sm text-white/60">
                  Price based on input/output token count. Best for LLM-powered
                  tools and content generation.
                </p>
                <p className="font-mono text-xs text-white/30 mt-2">
                  e.g. $0.01/1K tokens
                </p>
              </div>
              <div className="p-4 bg-black">
                <span className="font-mono text-xs text-white/40 block mb-2">
                  per-compute
                </span>
                <p className="text-sm text-white/60">
                  Price based on execution time or resource usage. Best for
                  heavy processing, image gen, code execution.
                </p>
                <p className="font-mono text-xs text-white/30 mt-2">
                  e.g. $0.05/sec
                </p>
              </div>
            </div>
          </div>

          <p>
            You can mix models across tools. Your weather lookup might be
            per-call at $0.001, while your satellite imagery tool charges
            per-compute at $0.05/second.
          </p>

          <CodeBlock
            language="typescript"
            code={`pricing: {
  "get-forecast":      { model: "per-call",    price: 0.001  },
  "get-satellite-img": { model: "per-compute", price: 0.05   },
  "summarize-report":  { model: "per-token",   price: 0.008  },
}`}
          />

          <StepHeader number={5} title="Start Earning" />

          <p>
            Once your wrapped server is live, it shows up in the Agent Bazaar
            marketplace. Agents browsing for weather tools will find yours,
            inspect your pricing and trust score, and start calling.
          </p>

          <p>Revenue flows like this:</p>

          <div className="border border-white/10 rounded-lg p-6 my-6 font-mono text-sm text-white/60 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-white/30">1.</span>
              <span>Agent discovers your tool on Bazaar</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/30">2.</span>
              <span>Agent opens a billing session (pre-authorized)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/30">3.</span>
              <span>Agent calls your tool → middleware meters the call</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/30">4.</span>
              <span>
                Signed receipt emitted → agent gets proof, you get payment
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/30">5.</span>
              <span>
                Settlement runs daily → funds hit your connected Stripe account
              </span>
            </div>
          </div>

          <p>
            No invoices. No payment pages. No &ldquo;contact sales.&rdquo; The
            protocol handles everything.
          </p>

          <div className="border-t border-white/10 my-12" />

          <h2 className="font-mono text-2xl font-bold text-white/90 mb-6">
            What About Competitors?
          </h2>

          <p>
            You have options. <strong className="text-white/90">x402</strong>{" "}
            offers crypto-native payments (USDC on L2), but requires wallets on
            both sides.{" "}
            <strong className="text-white/90">Moesif and Kong</strong> provide
            enterprise API billing, but require gateway infrastructure.{" "}
            <strong className="text-white/90">TollBit</strong> is building a
            closed publisher network.
          </p>

          <p>
            Agent Bazaar is the only solution that combines{" "}
            <strong className="text-white/90">
              marketplace discovery + open billing spec + trust primitives
            </strong>{" "}
            in a single SDK. And the{" "}
            <a
              href="/specs/mcp-billing-v1"
              className="text-white underline underline-offset-4 hover:text-white/80"
            >
              billing spec is MIT-licensed
            </a>{" "}
            — you&apos;re not locked in.
          </p>

          <div className="border-t border-white/10 my-12" />

          <h2 className="font-mono text-2xl font-bold text-white/90 mb-6">
            The Math
          </h2>

          <p>
            Let&apos;s say your MCP server handles 50,000 tool calls per month
            from various agents. At $0.001 per call, that&apos;s{" "}
            <strong className="text-white/90">$50/month</strong> — enough to
            cover hosting and then some for a side project.
          </p>

          <p>
            At $0.01 per call (reasonable for tools that hit paid APIs), that&apos;s{" "}
            <strong className="text-white/90">$500/month</strong>. A popular MCP
            server doing 500K calls/month at the same rate:{" "}
            <strong className="text-white/90">$5,000/month</strong>.
          </p>

          <p>
            The MCP ecosystem is growing exponentially. There were 500 servers a
            year ago. There are 10,000+ today. Agent traffic is following the
            same curve. The question isn&apos;t whether your tools are worth
            charging for — it&apos;s how long you keep giving them away.
          </p>

          <div className="border-t border-white/10 my-12" />

          <div className="border border-white/20 rounded-lg p-6 bg-white/[0.02]">
            <h3 className="font-mono text-lg text-white/90 mb-3">
              Ready to start?
            </h3>
            <p className="text-white/60 mb-4">
              Register on Agent Bazaar, install the SDK, and start earning from
              your MCP server today. The whole setup takes less time than reading
              this article.
            </p>
            <div className="flex gap-4">
              <a
                href="/docs/bazaar"
                className="font-mono text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors"
              >
                Read the docs →
              </a>
              <a
                href="/specs/mcp-billing-v1"
                className="font-mono text-sm text-white/50 hover:text-white/70 px-4 py-2 transition-colors"
              >
                View the billing spec
              </a>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
