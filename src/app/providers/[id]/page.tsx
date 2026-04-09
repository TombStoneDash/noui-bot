"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Tool {
  id: string;
  tool_name: string;
  display_name: string;
  description: string;
  category: string;
  provider: { id: string; name: string; verified: boolean };
  pricing: {
    model: string;
    price_cents: number;
    price: string;
    free_tier_calls: number;
  };
  stats: {
    total_calls: number;
    avg_latency_ms: number | null;
    uptime_pct: number | null;
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function ToolDetailCard({ tool }: { tool: Tool }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const sdkSnippet = `import { Bazaar } from "@forthebots/bazaar-sdk";

const bz = new Bazaar({ apiKey: "bz_your_key" });

const result = await bz.tools.call("${tool.tool_name}", {
  // See input schema below
});`;

  const curlSnippet = `curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer bz_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"tool_name": "${tool.tool_name}", "input": {}}'`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-mono text-sm font-medium text-white">
            {tool.display_name}
          </h3>
          <p className="font-mono text-[10px] text-white/20 mt-0.5">
            {tool.tool_name}
          </p>
        </div>
        <span
          className={`font-mono text-sm font-bold shrink-0 ${
            tool.pricing.price_cents === 0 ? "text-emerald-400" : "text-white"
          }`}
        >
          {tool.pricing.price}
        </span>
      </div>

      <p className="text-sm text-white/50 leading-relaxed mb-4">
        {tool.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {tool.stats.total_calls > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] rounded">
            <span className="text-[10px] text-white/30 font-mono">calls</span>
            <span className="text-[11px] text-white/60 font-mono">
              {formatNumber(tool.stats.total_calls)}
            </span>
          </div>
        )}
        {tool.stats.avg_latency_ms && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] rounded">
            <span className="text-[10px] text-white/30 font-mono">
              latency
            </span>
            <span className="text-[11px] text-white/60 font-mono">
              {tool.stats.avg_latency_ms}ms
            </span>
          </div>
        )}
        {tool.stats.uptime_pct && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] rounded">
            <span className="text-[10px] text-white/30 font-mono">uptime</span>
            <span className="text-[11px] text-white/60 font-mono">
              {tool.stats.uptime_pct}%
            </span>
          </div>
        )}
        {tool.pricing.free_tier_calls > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/5 rounded border border-emerald-500/10">
            <span className="text-[10px] text-emerald-400/60 font-mono">
              {tool.pricing.free_tier_calls} free/mo
            </span>
          </div>
        )}
        <span className="text-[10px] text-white/20 font-mono">
          {tool.pricing.model}
        </span>
      </div>

      {/* Integration Code */}
      <button
        onClick={() => setShowCode(!showCode)}
        className="font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        {showCode ? "Hide integration code" : "Show integration code"}
      </button>

      {showCode && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-white/30">
                SDK (TypeScript)
              </span>
              <button
                onClick={() => copy(sdkSnippet)}
                className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="bg-black/50 border border-white/[0.06] rounded p-3 text-xs text-white/60 font-mono overflow-x-auto whitespace-pre-wrap">
              {sdkSnippet}
            </pre>
          </div>
          <div>
            <span className="font-mono text-[10px] text-white/30">cURL</span>
            <pre className="bg-black/50 border border-white/[0.06] rounded p-3 text-xs text-white/60 font-mono overflow-x-auto whitespace-pre-wrap mt-1">
              {curlSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tools, setTools] = useState<Tool[]>([]);
  const [providerName, setProviderName] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchProvider() {
      try {
        const res = await fetch("/api/bazaar/catalog");
        const data = await res.json();
        if (data.tools) {
          const providerTools = (data.tools as Tool[]).filter(
            (t) => t.provider.id === id
          );
          if (providerTools.length === 0) {
            setNotFound(true);
          } else {
            setTools(providerTools);
            setProviderName(providerTools[0].provider.name);
            setVerified(providerTools[0].provider.verified);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProvider();
  }, [id]);

  const totalCalls = tools.reduce((s, t) => s + t.stats.total_calls, 0);
  const uptimes = tools
    .map((t) => t.stats.uptime_pct)
    .filter((u): u is number => u !== null);
  const avgUptime =
    uptimes.length > 0
      ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="font-mono text-sm text-white/30 animate-pulse">
          Loading provider...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16">
        <Link
          href="/providers"
          className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          &larr; All Providers
        </Link>
        <div className="mt-16 text-center">
          <h1 className="font-mono text-2xl font-bold mb-4">
            Provider not found
          </h1>
          <p className="text-white/40 font-mono text-sm mb-8">
            This provider doesn&apos;t exist or has no active tools.
          </p>
          <Link
            href="/providers"
            className="font-mono text-sm text-emerald-400 hover:text-emerald-300"
          >
            Browse all providers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 md:px-16 lg:px-24 py-16 border-b border-white/[0.06]">
        <Link
          href="/providers"
          className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          &larr; All Providers
        </Link>

        <div className="flex items-center gap-4 mt-8 mb-4">
          <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center font-mono text-white/50 text-xl rounded">
            {providerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-2xl md:text-3xl font-bold">
                {providerName}
              </h1>
              {verified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400 font-mono">
                  verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-6">
          <div>
            <span className="font-mono text-xl font-bold text-white">
              {tools.length}
            </span>
            <span className="text-xs text-white/30 font-mono ml-1.5">
              tools
            </span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {formatNumber(totalCalls)}
            </span>
            <span className="text-xs text-white/30 font-mono ml-1.5">
              total calls
            </span>
          </div>
          {avgUptime > 0 && (
            <>
              <div className="w-px h-4 bg-white/10" />
              <div>
                <span className="font-mono text-xl font-bold text-white">
                  {avgUptime.toFixed(1)}%
                </span>
                <span className="text-xs text-white/30 font-mono ml-1.5">
                  avg uptime
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tool Catalog */}
      <div className="px-6 md:px-16 lg:px-24 py-8">
        <h2 className="font-mono text-xs text-white/30 tracking-widest uppercase mb-6">
          Tool Catalog
        </h2>
        <div className="space-y-4">
          {tools.map((tool) => (
            <ToolDetailCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>

      {/* Reviews Placeholder */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/[0.06]">
        <h2 className="font-mono text-xs text-white/30 tracking-widest uppercase mb-6">
          Reviews
        </h2>
        <div className="border border-white/[0.06] rounded-lg p-8 text-center">
          <p className="font-mono text-sm text-white/20">
            Reviews coming soon. Be the first to use these tools and leave
            feedback.
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/[0.06]">
        <h2 className="font-mono text-xs text-white/30 tracking-widest uppercase mb-6">
          Quick Start
        </h2>
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
            <span className="font-mono text-[10px] text-white/30">
              1. Install the SDK
            </span>
            <pre className="font-mono text-xs text-white/60 mt-2">
              npm install @forthebots/bazaar-sdk
            </pre>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
            <span className="font-mono text-[10px] text-white/30">
              2. Get an API key
            </span>
            <pre className="font-mono text-xs text-white/60 mt-2">
              curl -X POST https://noui.bot/api/bazaar/register-consumer \{"\n"}
              {"  "}-d &apos;{`{"name":"My Agent","email":"me@example.com"}`}&apos;
            </pre>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
            <span className="font-mono text-[10px] text-white/30">
              3. Call a tool
            </span>
            <pre className="font-mono text-xs text-white/60 mt-2">
              {`const result = await bz.tools.call("${tools[0]?.tool_name || "tool_name"}", { /* input */ });`}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <Link
            href="/providers"
            className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            &larr; All providers
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/developers/register"
              className="font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Get API Key
            </Link>
            <Link
              href="/docs/bazaar"
              className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
