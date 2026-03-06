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

// Seed tools to show when DB is empty (demo mode)
const SEED_TOOLS: Tool[] = [
  {
    id: "seed-1",
    tool_name: "web_search",
    display_name: "Web Search",
    description: "Search the web using multiple engines. Returns titles, URLs, and snippets. Supports region filtering and freshness controls.",
    category: "search",
    provider: { id: "p1", name: "Firecrawl", verified: true },
    pricing: { model: "per_call", price_cents: 1, price: "$0.0100/call", free_tier_calls: 100 },
    stats: { total_calls: 14200, avg_latency_ms: 340, uptime_pct: 99.8 },
  },
  {
    id: "seed-2",
    tool_name: "weather_forecast",
    display_name: "Weather Forecast",
    description: "7-day weather forecast for any location. Includes temperature, precipitation, wind, humidity, and UV index.",
    category: "weather",
    provider: { id: "p2", name: "WeatherStack", verified: true },
    pricing: { model: "per_call", price_cents: 0, price: "Free", free_tier_calls: 0 },
    stats: { total_calls: 8900, avg_latency_ms: 120, uptime_pct: 99.95 },
  },
  {
    id: "seed-3",
    tool_name: "code_execute",
    display_name: "Code Sandbox",
    description: "Execute Python, JavaScript, or TypeScript code in a secure sandbox. 30-second timeout, 256MB memory limit. Returns stdout, stderr, and exit code.",
    category: "code",
    provider: { id: "p3", name: "E2B", verified: true },
    pricing: { model: "per_call", price_cents: 5, price: "$0.0500/call", free_tier_calls: 50 },
    stats: { total_calls: 23400, avg_latency_ms: 890, uptime_pct: 99.5 },
  },
  {
    id: "seed-4",
    tool_name: "scrape_url",
    display_name: "URL Scraper",
    description: "Extract structured content from any URL. Returns clean markdown, metadata, and links. Handles JavaScript-rendered pages.",
    category: "data",
    provider: { id: "p1", name: "Firecrawl", verified: true },
    pricing: { model: "per_call", price_cents: 2, price: "$0.0200/call", free_tier_calls: 50 },
    stats: { total_calls: 31200, avg_latency_ms: 1200, uptime_pct: 99.3 },
  },
  {
    id: "seed-5",
    tool_name: "send_email",
    display_name: "Send Email",
    description: "Send transactional emails via verified domains. Supports HTML templates, attachments, and tracking. SPF/DKIM authenticated.",
    category: "comms",
    provider: { id: "p4", name: "Resend", verified: true },
    pricing: { model: "per_call", price_cents: 0, price: "$0.0010/call", free_tier_calls: 200 },
    stats: { total_calls: 5600, avg_latency_ms: 450, uptime_pct: 99.9 },
  },
  {
    id: "seed-6",
    tool_name: "vector_search",
    display_name: "Vector Search",
    description: "Semantic similarity search across document collections. 1536-dimension embeddings, cosine similarity, with metadata filtering.",
    category: "data",
    provider: { id: "p5", name: "Pinecone", verified: false },
    pricing: { model: "per_call", price_cents: 1, price: "$0.0100/call", free_tier_calls: 100 },
    stats: { total_calls: 18700, avg_latency_ms: 45, uptime_pct: 99.99 },
  },
  {
    id: "seed-7",
    tool_name: "pdf_extract",
    display_name: "PDF Extraction",
    description: "Extract text, tables, and images from PDF documents. Handles scanned PDFs via OCR. Returns structured markdown with table detection.",
    category: "data",
    provider: { id: "p6", name: "Unstructured", verified: true },
    pricing: { model: "per_call", price_cents: 3, price: "$0.0300/call", free_tier_calls: 25 },
    stats: { total_calls: 9100, avg_latency_ms: 2100, uptime_pct: 99.1 },
  },
  {
    id: "seed-8",
    tool_name: "image_generate",
    display_name: "Image Generation",
    description: "Generate images from text prompts using SDXL and Flux models. Supports style presets, negative prompts, and aspect ratios.",
    category: "other",
    provider: { id: "p7", name: "Replicate", verified: true },
    pricing: { model: "per_call", price_cents: 4, price: "$0.0400/call", free_tier_calls: 10 },
    stats: { total_calls: 42000, avg_latency_ms: 3500, uptime_pct: 98.7 },
  },
  {
    id: "seed-9",
    tool_name: "github_search",
    display_name: "GitHub Code Search",
    description: "Search GitHub repositories, code, issues, and pull requests. Filter by language, stars, forks, and update date.",
    category: "code",
    provider: { id: "p8", name: "GitMCP", verified: false },
    pricing: { model: "per_call", price_cents: 1, price: "$0.0100/call", free_tier_calls: 200 },
    stats: { total_calls: 15300, avg_latency_ms: 280, uptime_pct: 99.7 },
  },
  {
    id: "seed-10",
    tool_name: "seo_analysis",
    display_name: "SEO Analysis",
    description: "Comprehensive SEO audit for any URL. SERP position, backlink count, keyword density, page speed, and competitor comparison.",
    category: "data",
    provider: { id: "p9", name: "DataForSEO", verified: true },
    pricing: { model: "per_call", price_cents: 10, price: "$0.1000/call", free_tier_calls: 10 },
    stats: { total_calls: 3200, avg_latency_ms: 4200, uptime_pct: 99.2 },
  },
];

export default function MarketplacePage() {
  const [tools, setTools] = useState<Tool[]>(SEED_TOOLS);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchTools() {
      try {
        const res = await fetch("/api/bazaar/catalog");
        const data = await res.json();
        if (data.tools && data.tools.length > 0) {
          setTools(data.tools);
        } else {
          // Show seed/demo tools when catalog is empty
          setTools(SEED_TOOLS);
        }
      } catch {
        setTools(SEED_TOOLS);
      } finally {
        setLoading(false);
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="font-mono text-sm text-white/30 animate-pulse">
              Loading catalog...
            </div>
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
