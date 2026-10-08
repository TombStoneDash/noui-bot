"use client";

import { useState, useEffect } from "react";

interface Tool {
  id: string;
  tool_name: string;
  display_name: string;
  description: string;
  category: string;
  provider: {
    id: string;
    name: string;
    verified: boolean;
  };
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

const CATEGORIES = [
  { id: "all", label: "All Tools", icon: "⚡" },
  { id: "weather", label: "Weather", icon: "🌤️" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "code", label: "Code", icon: "💻" },
  { id: "data", label: "Data", icon: "📊" },
  { id: "comms", label: "Communication", icon: "💬" },
  { id: "other", label: "Other", icon: "🔧" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function TrustBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-mono">
      ✓ verified
    </span>
  );
}

function PriceBadge({ pricing }: { pricing: Tool["pricing"] }) {
  const isFree = pricing.price_cents === 0;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-mono text-sm font-bold ${
          isFree ? "text-emerald-400" : "text-white"
        }`}
      >
        {pricing.price}
      </span>
      {pricing.free_tier_calls > 0 && !isFree && (
        <span className="text-[10px] text-white/30 font-mono">
          {pricing.free_tier_calls} free/mo
        </span>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] rounded">
      <span className="text-[10px] text-white/30 font-mono">{label}</span>
      <span className="text-[11px] text-white/60 font-mono">{value}</span>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group border border-white/[0.06] rounded-lg p-5 hover:border-white/[0.12] transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/20 font-mono">
              {CATEGORIES.find((c) => c.id === tool.category)?.icon || "⚡"}
            </span>
            <h3 className="font-mono text-sm font-medium text-white truncate">
              {tool.display_name}
            </h3>
            <TrustBadge verified={tool.provider.verified} />
          </div>
          <p className="text-xs text-white/40 font-mono mb-2 truncate">
            by {tool.provider.name}
          </p>
          <p className="text-sm text-white/50 leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <PriceBadge pricing={tool.pricing} />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {tool.stats.total_calls > 0 && (
          <StatPill
            label="calls"
            value={formatNumber(tool.stats.total_calls)}
          />
        )}
        {tool.stats.avg_latency_ms && (
          <StatPill label="latency" value={`${tool.stats.avg_latency_ms}ms`} />
        )}
        {tool.stats.uptime_pct && (
          <StatPill label="uptime" value={`${tool.stats.uptime_pct}%`} />
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-white/20 font-mono">
          {tool.pricing.model}
        </span>
      </div>

      {/* Expanded: integration snippet */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/30 font-mono mb-2">
            Quick integration:
          </p>
          <pre className="bg-black/50 border border-white/[0.06] rounded p-3 text-xs text-white/60 font-mono overflow-x-auto">
{`curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer bz_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"tool_name": "${tool.tool_name}", "input": {}}'`}
          </pre>
          <div className="flex items-center gap-3 mt-3">
            <a
              href="/developers/register"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Get API Key →
            </a>
            <a
              href="/docs/bazaar"
              className="text-xs text-white/30 hover:text-white/50 font-mono transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Full docs →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTool(value: unknown): value is Tool {
  if (!isRecord(value)) return false;
  const { provider, pricing, stats } = value;
  return (
    [value.id, value.tool_name, value.display_name, value.description, value.category]
      .every((field) => typeof field === "string") &&
    isRecord(provider) &&
    typeof provider.id === "string" &&
    typeof provider.name === "string" &&
    typeof provider.verified === "boolean" &&
    isRecord(pricing) &&
    typeof pricing.model === "string" &&
    typeof pricing.price === "string" &&
    isFiniteNumber(pricing.price_cents) &&
    isFiniteNumber(pricing.free_tier_calls) &&
    isRecord(stats) &&
    isFiniteNumber(stats.total_calls) &&
    (stats.avg_latency_ms === null || isFiniteNumber(stats.avg_latency_ms)) &&
    (stats.uptime_pct === null || isFiniteNumber(stats.uptime_pct))
  );
}

export default function MarketplacePage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchTools() {
      try {
        const res = await fetch("/api/bazaar/catalog");
        if (!res.ok) throw new Error("Catalog request failed");
        const data: unknown = await res.json();
        if (!isRecord(data) || !Array.isArray(data.tools) || !data.tools.every(isTool)) {
          throw new Error("Invalid catalog response");
        }
        setTools(data.tools);
        setCatalogStatus("success");
      } catch {
        setTools([]);
        setCatalogStatus("error");
      }
    }
    fetchTools();
  }, []);

  const filtered = tools.filter((t) => {
    const matchesCategory =
      activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      t.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.provider.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCalls = tools.reduce((sum, t) => sum + t.stats.total_calls, 0);
  const providers = new Set(tools.map((t) => t.provider.id)).size;
  const avgUptime =
    tools.reduce((sum, t) => sum + (t.stats.uptime_pct || 0), 0) /
    (tools.length || 1);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 md:px-16 lg:px-24 py-16 border-b border-white/[0.06]">
        <a
          href="/"
          className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          ← noui.bot
        </a>

        <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
          Agent Bazaar
        </h1>
        <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed">
          Browse MCP tools. Every tool is metered, billed, and monitored.
          Integrate with one API call.
        </p>

        {/* Stats bar */}
        {catalogStatus === "success" && tools.length > 0 && (
          <div className="flex items-center gap-6 mt-8">
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
              <span className="font-mono text-xl font-bold text-white">
                {providers}
              </span>
              <span className="text-xs text-white/30 font-mono ml-1.5">
                providers
              </span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div>
              <span className="font-mono text-xl font-bold text-emerald-400">
                {formatNumber(totalCalls)}
              </span>
              <span className="text-xs text-white/30 font-mono ml-1.5">
                calls metered
              </span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div>
              <span className="font-mono text-xl font-bold text-white">
                {avgUptime.toFixed(1)}%
              </span>
              <span className="text-xs text-white/30 font-mono ml-1.5">
                avg uptime
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 md:px-16 lg:px-24 py-6 border-b border-white/[0.06] sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-1.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 w-48"
          />

          {/* Category pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                  activeCategory === cat.id
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/30 hover:text-white/50 border border-transparent"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tool grid */}
      <div className="px-6 md:px-16 lg:px-24 py-8">
        {catalogStatus === "loading" ? (
          <div className="flex items-center justify-center py-20">
            <div className="font-mono text-sm text-white/30 animate-pulse">
              Loading catalog...
            </div>
          </div>
        ) : catalogStatus === "error" ? (
          <div role="alert" className="text-center py-20">
            <p className="font-mono text-sm text-white/50">
              Unable to load the catalog. Please try again later.
            </p>
          </div>
        ) : tools.length === 0 ? (
          <div role="status" className="text-center py-20">
            <p className="font-mono text-sm text-white/30">
              No tools are available in the catalog yet.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-white/30">
              No tools match your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 md:px-16 lg:px-24 py-16 border-t border-white/[0.06]">
        <div className="max-w-xl">
          <h2 className="font-mono text-lg font-bold mb-2">
            List your MCP server
          </h2>
          <p className="text-sm text-white/40 mb-6 leading-relaxed">
            Set your pricing, connect Stripe, and start earning from every tool
            call. The Bazaar handles billing, metering, rate limiting, and trust
            scoring.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/providers/register"
              className="px-4 py-2 bg-white text-black font-mono text-sm rounded hover:bg-white/90 transition-colors"
            >
              Register as Provider →
            </a>
            <a
              href="/developers/register"
              className="px-4 py-2 border border-white/20 text-white/60 font-mono text-sm rounded hover:border-white/40 hover:text-white transition-colors"
            >
              Get API Key
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-white/20 font-mono">
          <span>noui.bot — Agent Bazaar</span>
          <div className="flex items-center gap-4">
            <a href="/docs" className="hover:text-white/40 transition-colors">
              Docs
            </a>
            <a
              href="/specs/mcp-billing-v1"
              className="hover:text-white/40 transition-colors"
            >
              Spec
            </a>
            <a
              href="/changelog"
              className="hover:text-white/40 transition-colors"
            >
              Changelog
            </a>
            <a
              href="https://github.com/TombStoneDash/mcp-billing-spec"
              className="hover:text-white/40 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
