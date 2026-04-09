"use client";

import { useState } from "react";
import Link from "next/link";

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center font-mono text-emerald-400 text-sm">
          {number}
        </span>
        <h3 className="font-mono text-sm font-medium text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      {label && (
        <span className="font-mono text-[10px] text-white/30 mb-1 block">
          {label}
        </span>
      )}
      <div className="relative">
        <pre className="bg-black/50 border border-white/[0.06] rounded p-3 text-xs text-white/60 font-mono overflow-x-auto whitespace-pre-wrap pr-16">
          {code}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors bg-black/50 px-2 py-1 rounded"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function TryItWidget() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleTry() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/bazaar/catalog");
      const data = await res.json();
      const toolCount = data.tools?.length || 0;
      const providers = new Set(
        data.tools?.map((t: { provider: { id: string } }) => t.provider.id)
      ).size;
      setResult(
        JSON.stringify(
          {
            status: "ok",
            tools: toolCount,
            providers,
            sample: data.tools?.[0]
              ? {
                  name: data.tools[0].display_name,
                  price: data.tools[0].pricing.price,
                  provider: data.tools[0].provider.name,
                }
              : null,
          },
          null,
          2
        )
      );
    } catch {
      setResult(JSON.stringify({ error: "Failed to reach API" }, null, 2));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="border border-emerald-500/20 rounded-lg bg-emerald-500/[0.03] p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-red-500/60" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <span className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="font-mono text-xs text-white/30 ml-2">
          live terminal
        </span>
      </div>

      <div className="font-mono text-xs mb-3">
        <span className="text-emerald-400/70">$</span>{" "}
        <span className="text-white/60">
          curl https://noui.bot/api/bazaar/catalog
        </span>
      </div>

      {result && (
        <pre className="bg-black/30 rounded p-3 text-xs text-white/50 font-mono overflow-x-auto mb-3 max-h-48 overflow-y-auto">
          {result}
        </pre>
      )}

      <button
        onClick={handleTry}
        disabled={running}
        className="font-mono text-xs bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
      >
        {running ? "Running..." : result ? "Run again" : "Run this command"}
      </button>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 md:px-16 lg:px-24 py-16 border-b border-white/[0.06]">
        <Link
          href="/"
          className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          &larr; noui.bot
        </Link>

        <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
          Get Started
        </h1>
        <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed">
          From zero to your first metered API call in under 2 minutes.
        </p>
      </div>

      {/* Steps */}
      <div className="px-6 md:px-16 lg:px-24 py-12 space-y-6 max-w-3xl">
        <Step number="1" title="Install the SDK">
          <CopyBlock code="npm install @forthebots/bazaar-sdk" />
          <p className="font-mono text-xs text-white/30 mt-3">
            Or use the REST API directly — no SDK required.
          </p>
        </Step>

        <Step number="2" title="Get an API key">
          <CopyBlock
            code={`curl -X POST https://noui.bot/api/bazaar/register-consumer \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Agent", "email": "you@example.com"}'`}
          />
          <p className="font-mono text-xs text-white/30 mt-3">
            Free tier: 100 calls/month. No credit card required.
          </p>
          <Link
            href="/developers/register"
            className="inline-block mt-3 font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Or register with the web form
          </Link>
        </Step>

        <Step number="3" title="Browse available tools">
          <CopyBlock code="curl https://noui.bot/api/bazaar/catalog | jq '.tools'" />
          <p className="font-mono text-xs text-white/30 mt-3">
            Or browse the{" "}
            <Link href="/providers" className="text-emerald-400 hover:text-emerald-300">
              provider catalog
            </Link>{" "}
            in your browser.
          </p>
        </Step>

        <Step number="4" title="Make your first call">
          <CopyBlock
            label="TypeScript (SDK)"
            code={`import { Bazaar } from "@forthebots/bazaar-sdk";

const bz = new Bazaar({ apiKey: "bz_your_key" });

const result = await bz.tools.call("web_search", {
  query: "latest MCP protocol updates"
});

console.log(result);`}
          />
          <CopyBlock
            label="cURL"
            code={`curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer bz_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"tool_name": "web_search", "input": {"query": "MCP protocol"}}'`}
          />
        </Step>

        <Step number="5" title="Check your usage">
          <CopyBlock
            code={`const usage = await bz.usage.summary();
console.log(usage.total_calls, usage.total_cost);`}
          />
          <p className="font-mono text-xs text-white/30 mt-3">
            Or view your{" "}
            <Link href="/developers/dashboard" className="text-emerald-400 hover:text-emerald-300">
              dashboard
            </Link>
            .
          </p>
        </Step>
      </div>

      {/* Try It Now */}
      <div className="px-6 md:px-16 lg:px-24 py-12 border-t border-white/[0.06]">
        <h2 className="font-mono text-xs text-white/30 tracking-widest uppercase mb-6">
          Try It Now
        </h2>
        <div className="max-w-3xl">
          <TryItWidget />
        </div>
      </div>

      {/* Next Steps */}
      <div className="px-6 md:px-16 lg:px-24 py-12 border-t border-white/[0.06]">
        <h2 className="font-mono text-xs text-white/30 tracking-widest uppercase mb-6">
          Next Steps
        </h2>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl">
          <Link
            href="/providers"
            className="border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <h3 className="font-mono text-sm text-white mb-1">
              Browse Providers
            </h3>
            <p className="text-xs text-white/30">
              Discover tools from verified MCP providers
            </p>
          </Link>
          <Link
            href="/docs/bazaar"
            className="border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <h3 className="font-mono text-sm text-white mb-1">API Docs</h3>
            <p className="text-xs text-white/30">
              Full reference for all Bazaar endpoints
            </p>
          </Link>
          <Link
            href="/providers/register"
            className="border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <h3 className="font-mono text-sm text-white mb-1">
              Become a Provider
            </h3>
            <p className="text-xs text-white/30">
              List your tools and start earning
            </p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/[0.06]">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </div>
    </div>
  );
}
