"use client";

import { useState, useEffect } from "react";
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

interface Provider {
  id: string;
  name: string;
  verified: boolean;
  tools: Tool[];
  totalCalls: number;
  avgUptime: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function ProviderCard({ provider }: { provider: Provider }) {
  const [showSnippet, setShowSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `import { Bazaar } from "@forthebots/bazaar-sdk";

const bz = new Bazaar({ apiKey: "bz_your_key" });

// Call any tool from ${provider.name}
const result = await bz.tools.call("${provider.tools[0]?.tool_name || "tool_name"}", {
  // input parameters here
});

console.log(result);`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] hover:border-white/[0.15] transition-all">
      {/* Provider Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center font-mono text-white/50 text-sm rounded">
            {provider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/providers/${provider.id}`}
                className="font-mono text-sm font-medium text-white hover:text-green-400 transition-colors"
              >
                {provider.name}
              </Link>
              {provider.verified && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-mono">
                  verified
                </span>
              )}
            </div>
            <p className="text-xs text-white/30 font-mono">
              {provider.tools.length} tool{provider.tools.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-white/30">
            {formatNumber(provider.totalCalls)} calls
          </div>
          {provider.avgUptime > 0 && (
            <div className="font-mono text-xs text-white/20">
              {provider.avgUptime.toFixed(1)}% uptime
            </div>
          )}
        </div>
      </div>

      {/* Tools List */}
      <div className="space-y-2 mb-4">
        {provider.tools.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded border border-white/[0.04]"
          >
            <div className="flex-1 min-w-0">
              <span className="font-mono text-xs text-white/70 truncate block">
                {tool.display_name}
              </span>
              <span className="text-[10px] text-white/30 truncate block">
                {tool.description}
              </span>
            </div>
            <span
              className={`font-mono text-xs ml-3 shrink-0 ${
                tool.pricing.price_cents === 0
                  ? "text-emerald-400"
                  : "text-white/60"
              }`}
            >
              {tool.pricing.price}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSnippet(!showSnippet)}
          className="font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {showSnippet ? "Hide code" : "Try it"}
        </button>
        <Link
          href={`/providers/${provider.id}`}
          className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          View details
        </Link>
      </div>

      {/* SDK Snippet */}
      {showSnippet && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-white/30">
              SDK Integration
            </span>
            <button
              onClick={copySnippet}
              className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="bg-black/50 border border-white/[0.06] rounded p-3 text-xs text-white/60 font-mono overflow-x-auto whitespace-pre-wrap">
            {snippet}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await fetch("/api/bazaar/catalog");
        const data = await res.json();
        if (data.tools && data.tools.length > 0) {
          // Group tools by provider
          const map = new Map<string, Provider>();
          for (const tool of data.tools as Tool[]) {
            const pid = tool.provider.id;
            if (!map.has(pid)) {
              map.set(pid, {
                id: pid,
                name: tool.provider.name,
                verified: tool.provider.verified,
                tools: [],
                totalCalls: 0,
                avgUptime: 0,
              });
            }
            const p = map.get(pid)!;
            p.tools.push(tool);
            p.totalCalls += tool.stats.total_calls;
          }
          // Compute avg uptime
          for (const p of map.values()) {
            const uptimes = p.tools
              .map((t) => t.stats.uptime_pct)
              .filter((u): u is number => u !== null);
            p.avgUptime =
              uptimes.length > 0
                ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length
                : 0;
          }
          // Sort by total calls descending
          setProviders(
            Array.from(map.values()).sort(
              (a, b) => b.totalCalls - a.totalCalls
            )
          );
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  const filtered = providers.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tools.some(
        (t) =>
          t.display_name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      )
  );

  const totalTools = providers.reduce((s, p) => s + p.tools.length, 0);
  const totalCalls = providers.reduce((s, p) => s + p.totalCalls, 0);

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
          Providers
        </h1>
        <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed">
          MCP tool providers on Agent Bazaar. Every provider is metered,
          monitored, and auditable.
        </p>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-8">
          <div>
            <span className="font-mono text-xl font-bold text-white">
              {providers.length}
            </span>
            <span className="text-xs text-white/30 font-mono ml-1.5">
              providers
            </span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div>
            <span className="font-mono text-xl font-bold text-white">
              {totalTools}
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
        </div>
      </div>

      {/* Search */}
      <div className="px-6 md:px-16 lg:px-24 py-6 border-b border-white/[0.06] sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <input
          type="text"
          placeholder="Search providers or tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-1.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 w-64"
        />
      </div>

      {/* Provider Grid */}
      <div className="px-6 md:px-16 lg:px-24 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="font-mono text-sm text-white/30 animate-pulse">
              Loading providers...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-white/30">
              {search ? "No providers match your search." : "No providers registered yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </div>

      {/* Register CTA */}
      <div className="px-6 md:px-16 lg:px-24 py-16 border-t border-white/[0.06]">
        <div className="max-w-xl">
          <h2 className="font-mono text-lg font-bold mb-2">
            Become a provider
          </h2>
          <p className="text-sm text-white/40 mb-6 leading-relaxed">
            List your MCP tools on Agent Bazaar. Set your own pricing, get
            discovered by agent developers, and earn from every tool call.
            Registration is instant — no approval process.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/providers/register"
              className="px-6 py-3 bg-white text-black font-mono text-sm rounded hover:bg-white/90 transition-colors"
            >
              Register as Provider
            </Link>
            <Link
              href="/docs/bazaar"
              className="px-6 py-3 border border-white/20 text-white/60 font-mono text-sm rounded hover:border-white/40 hover:text-white transition-colors"
            >
              Read the Docs
            </Link>
          </div>
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
