"use client";

import { useState } from "react";
import Link from "next/link";
import { PROVIDERS, type BazaarProvider } from "./providers";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "tools", label: "Tools" },
  { id: "data", label: "Data" },
  { id: "integrations", label: "Integrations" },
];

function ProviderCard({ provider }: { provider: BazaarProvider }) {
  return (
    <Link
      href={`/bazaar/${provider.slug}`}
      className="block border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] hover:border-white/[0.15] transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-xs text-white/30 uppercase tracking-wider">
          {provider.category}
        </span>
        <span className="font-mono text-[10px] text-white/20">
          {provider.tools.length} tools
        </span>
      </div>

      <h2 className="font-mono text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
        {provider.name}
      </h2>

      <p className="font-mono text-xs text-white/40 leading-relaxed mb-4 line-clamp-2">
        {provider.description}
      </p>

      <div className="bg-black/30 border border-white/[0.06] rounded px-3 py-2 mb-4">
        <code className="font-mono text-[11px] text-emerald-400/70 break-all">
          {provider.install}
        </code>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {provider.tools.slice(0, 3).map((tool) => (
          <span
            key={tool}
            className="font-mono text-[10px] text-white/30 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-0.5"
          >
            {tool}
          </span>
        ))}
        {provider.tools.length > 3 && (
          <span className="font-mono text-[10px] text-white/20">
            +{provider.tools.length - 3} more
          </span>
        )}
      </div>
    </Link>
  );
}

export default function BazaarPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = PROVIDERS.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tools.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

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
          Agent Bazaar
        </h1>
        <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed">
          MCP servers you can add to any agent. Browse, install, connect.
        </p>

        <div className="flex items-center gap-6 mt-8">
          <span className="font-mono text-xl font-bold text-white">
            {PROVIDERS.length}
          </span>
          <span className="text-xs text-white/30 font-mono -ml-4">
            providers
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 md:px-16 lg:px-24 py-6 border-b border-white/[0.06] sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="text"
            placeholder="Search providers or tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-1.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 w-64"
          />
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`font-mono text-xs px-3 py-1.5 rounded transition-colors ${
                  category === cat.id
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/30 border border-white/[0.06] hover:border-white/15 hover:text-white/50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Grid */}
      <div className="px-6 md:px-16 lg:px-24 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-white/30">
              No providers match your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <ProviderCard key={p.slug} provider={p} />
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
            Register your tools on Agent Bazaar. Set pricing, get discovered,
            earn from every call.
          </p>
          <Link
            href="/providers/register"
            className="px-6 py-3 bg-white text-black font-mono text-sm rounded hover:bg-white/90 transition-colors"
          >
            Register as Provider
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
