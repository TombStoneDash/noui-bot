"use client";

import { useState, useEffect, useCallback } from "react";

interface ProviderSummary {
  provider: { id: string; name: string; email?: string; verified?: boolean };
  tools: Array<{
    tool: string;
    calls: number;
    gross_cents: number;
    net_cents: number;
  }>;
  billing: {
    total_calls: number;
    gross_revenue_cents: number;
    platform_fee_cents: number;
    net_earnings_cents: number;
  };
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

export default function ProviderDashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [summary, setSummary] = useState<ProviderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (key: string) => {
    setLoading(true);
    setError("");

    try {
      // Fetch provider summary (POST with auth)
      const res = await fetch("/api/bazaar/billing/provider-summary", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ period: "all" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Authentication failed");
        return;
      }

      // Normalize the API response to our dashboard format
      const totalCalls = (data.by_tool || []).reduce((s: number, t: { calls: number }) => s + t.calls, 0);
      setSummary({
        provider: data.provider,
        tools: data.by_tool || [],
        billing: {
          total_calls: totalCalls,
          gross_revenue_cents: data.earnings?.gross_revenue_cents || 0,
          platform_fee_cents: data.earnings?.platform_fee_cents || 0,
          net_earnings_cents: data.earnings?.net_earnings_cents || 0,
        },
      });
      setAuthenticated(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for key in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keyParam = params.get("key");
    if (keyParam?.startsWith("bz_")) {
      setApiKey(keyParam);
      fetchDashboard(keyParam);
    }
  }, [fetchDashboard]);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (apiKey.trim()) {
      fetchDashboard(apiKey.trim());
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Provider Dashboard
      </h1>
      <p className="text-white/40 font-mono text-sm mb-12">
        Your tools, usage, and earnings
      </p>

      {!authenticated ? (
        <form onSubmit={handleAuth} className="space-y-6 max-w-lg">
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Provider API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="bz_..."
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {error && (
            <div className="font-mono text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-mono text-sm bg-white text-black px-8 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "View Dashboard →"}
          </button>

          <p className="font-mono text-xs text-white/20">
            Don&apos;t have an API key?{" "}
            <a href="/providers/register" className="text-white/40 hover:text-white/60 underline">
              Register as a provider
            </a>
          </p>
        </form>
      ) : summary ? (
        <div className="space-y-10">
          {/* Provider Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-lg font-bold">{summary.provider.name}</div>
              <div className="font-mono text-xs text-white/40 mt-1">{summary.provider.email}</div>
            </div>
            {summary.provider.verified && (
              <span className="font-mono text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded">
                ✓ Verified
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Calls" value={summary.billing.total_calls.toLocaleString()} />
            <StatCard label="Gross Revenue" value={cents(summary.billing.gross_revenue_cents)} />
            <StatCard label="Platform Fee (18%)" value={cents(summary.billing.platform_fee_cents)} sub="text-red-400/70" />
            <StatCard label="Net Earnings" value={cents(summary.billing.net_earnings_cents)} highlight />
          </div>

          {/* Tools */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-sm text-white/50 uppercase tracking-wider">
                Your Tools ({summary.tools.length})
              </h2>
              <a
                href="/docs/bazaar"
                className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Add tools →
              </a>
            </div>

            {summary.tools.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                <p className="font-mono text-white/40 text-sm mb-4">No tools registered yet</p>
                <pre className="font-mono text-xs text-white/60 bg-black border border-white/10 rounded p-4 text-left overflow-x-auto">{`curl -X POST https://noui.bot/api/bazaar/tools \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"tools": [{"tool_name": "my_tool", "description": "...", "price_cents_override": 1}]}'`}</pre>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.tools.map((tool, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-sm font-medium">
                        {tool.tool}
                      </div>
                      <div className="font-mono text-xs text-white/20 mt-1">
                        Net: {cents(tool.net_cents)} · Gross: {cents(tool.gross_cents)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold">
                        {tool.calls.toLocaleString()}
                      </div>
                      <div className="font-mono text-xs text-white/40">calls</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="border-t border-white/5 pt-8 flex gap-4">
            <a
              href="/api/bazaar/catalog"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              View Catalog →
            </a>
            <a
              href="/docs/bazaar"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              API Docs →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-4 ${highlight ? "border-green-500/30 bg-green-500/5" : ""}`}>
      <div className="font-mono text-xs text-white/40 mb-1">{label}</div>
      <div className={`font-mono text-xl font-bold ${sub || (highlight ? "text-green-400" : "")}`}>
        {value}
      </div>
    </div>
  );
}
