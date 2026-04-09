"use client";

import { useState, useEffect, useCallback } from "react";

interface UsageSummary {
  consumer: { id: string; name: string; balance_cents: number };
  period: string;
  total_calls: number;
  total_cost_cents: number;
  by_tool: Array<{
    tool: string;
    calls: number;
    cost_cents: number;
  }>;
  by_day: Array<{
    date: string;
    calls: number;
    cost_cents: number;
  }>;
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

export default function DeveloperDashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const fetchDashboard = useCallback(async (key: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bazaar/usage/summary", {
        headers: { Authorization: `Bearer ${key}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Authentication failed");
        return;
      }

      setSummary(data);
      setAuthenticated(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

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
        Developer Dashboard
      </h1>
      <p className="text-white/40 font-mono text-sm mb-12">
        Your API usage, spending, and tool calls
      </p>

      {!authenticated ? (
        <form onSubmit={handleAuth} className="space-y-6 max-w-lg">
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Consumer API Key
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
            {loading ? "Loading..." : "View Dashboard →"}
          </button>

          <p className="font-mono text-xs text-white/20">
            Don&apos;t have an API key?{" "}
            <a href="/developers/register" className="text-white/40 hover:text-white/60 underline">
              Register as a developer
            </a>
          </p>
        </form>
      ) : summary ? (
        <div className="space-y-10">
          {/* Consumer Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-lg font-bold">{summary.consumer.name}</div>
              <div className="font-mono text-xs text-white/40 mt-1">Period: {summary.period}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-white/40">Balance</div>
              <div className="font-mono text-xl font-bold text-green-400">
                {cents(summary.consumer.balance_cents)}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="font-mono text-xs text-white/40 mb-1">Total Calls</div>
              <div className="font-mono text-2xl font-bold">{summary.total_calls.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="font-mono text-xs text-white/40 mb-1">Total Spend</div>
              <div className="font-mono text-2xl font-bold">{cents(summary.total_cost_cents)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="font-mono text-xs text-white/40 mb-1">Avg Cost/Call</div>
              <div className="font-mono text-2xl font-bold">
                {summary.total_calls > 0
                  ? cents(Math.round(summary.total_cost_cents / summary.total_calls))
                  : "$0.00"}
              </div>
            </div>
          </div>

          {/* Usage by Tool */}
          <div>
            <h2 className="font-mono text-sm text-white/50 uppercase tracking-wider mb-4">
              By Tool
            </h2>
            {summary.by_tool.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                <p className="font-mono text-white/40 text-sm mb-4">No calls yet</p>
                <a
                  href="/api/bazaar/catalog"
                  className="font-mono text-xs text-white/60 hover:text-white/80 underline"
                >
                  Browse available tools →
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.by_tool.map((tool, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-sm font-medium">{tool.tool}</div>
                      <div className="font-mono text-xs text-white/30 mt-1">
                        {cents(tool.cost_cents)} total
                      </div>
                    </div>
                    <div className="font-mono text-lg font-bold">
                      {tool.calls.toLocaleString()}
                      <span className="text-xs text-white/40 ml-1">calls</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage Graph — Last 30 Days */}
          {summary.by_day.length > 0 && (
            <div>
              <h2 className="font-mono text-sm text-white/50 uppercase tracking-wider mb-4">
                Last 30 Days
              </h2>
              <div className="flex items-end gap-[2px] h-32">
                {summary.by_day.slice(-30).map((day, i) => {
                  const maxCalls = Math.max(...summary.by_day.map((d) => d.calls), 1);
                  const pct = (day.calls / maxCalls) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-emerald-500/30 hover:bg-emerald-500/50 rounded-t transition-colors cursor-default group relative"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${day.date}: ${day.calls} calls (${cents(day.cost_cents)})`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[10px] text-white/20">
                  {summary.by_day.slice(-30)[0]?.date.slice(5)}
                </span>
                <span className="font-mono text-[10px] text-white/20">
                  {summary.by_day[summary.by_day.length - 1]?.date.slice(5)}
                </span>
              </div>
            </div>
          )}

          {/* API Key Management */}
          <div>
            <h2 className="font-mono text-sm text-white/50 uppercase tracking-wider mb-4">
              API Key
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <code className="font-mono text-sm text-white/60 flex-1 overflow-x-auto">
                  {showKey ? apiKey : `${apiKey.slice(0, 7)}${"•".repeat(20)}`}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    setKeyCopied(true);
                    setTimeout(() => setKeyCopied(false), 2000);
                  }}
                  className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  {keyCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="font-mono text-xs text-white/20 mt-2">
                Rate limit: 60 requests/minute
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-white/5 pt-8 flex gap-4 flex-wrap">
            <a
              href="/providers"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Browse Providers →
            </a>
            <a
              href="/docs/bazaar"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              API Docs →
            </a>
            <a
              href="/pricing"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Upgrade Plan →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
