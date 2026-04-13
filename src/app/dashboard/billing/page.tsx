"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface BillingSummary {
  provider: { id: string; name: string };
  period: string;
  earnings: {
    gross_revenue_cents: number;
    gross_revenue: string;
    platform_fee_cents: number;
    platform_fee: string;
    net_earnings_cents: number;
    net_earnings: string;
  };
  payout: {
    pending_balance_cents: number;
    pending_balance: string;
    last_payout_date: string | null;
    last_payout_cents: number | null;
  };
  by_tool: Array<{
    tool: string;
    calls: number;
    gross_cents: number;
    net_cents: number;
  }>;
  by_week: Array<{
    week_of: string;
    calls: number;
    gross_cents: number;
    net_cents: number;
  }>;
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
      <div className="font-mono text-xs text-white/40 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="font-mono text-2xl font-bold text-white">{value}</div>
      {sub && (
        <div className="font-mono text-xs text-white/30 mt-1">{sub}</div>
      )}
    </div>
  );
}

function MiniChart({ data }: { data: Array<{ net_cents: number }> }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.net_cents), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-emerald-500/30 hover:bg-emerald-500/50 rounded-t transition-colors"
          style={{ height: `${Math.max((d.net_cents / max) * 100, 4)}%` }}
          title={cents(d.net_cents)}
        />
      ))}
    </div>
  );
}

export default function BillingDashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBilling = useCallback(
    async (key: string, p: string) => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/bazaar/billing/provider-summary", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ period: p }),
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
    },
    []
  );

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    fetchBilling(apiKey, period);
  }

  function changePeriod(p: string) {
    setPeriod(p);
    if (authenticated) fetchBilling(apiKey, p);
  }

  function exportCSV() {
    if (!summary) return;
    const rows = [
      ["Tool", "Calls", "Gross Revenue", "Platform Fee", "Net Earnings"],
      ...summary.by_tool.map((t) => [
        t.tool,
        t.calls.toString(),
        cents(t.gross_cents),
        cents(t.gross_cents - t.net_cents),
        cents(t.net_cents),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bazaar-billing-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16">
      <Link
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </Link>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Billing Dashboard
      </h1>
      <p className="text-white/40 font-mono text-sm mb-8">
        Revenue, transactions, and payouts for your MCP tools.
      </p>

      {/* Nav */}
      <div className="flex gap-4 mb-12 border-b border-white/[0.06] pb-4">
        <Link
          href="/dashboard/billing"
          className="font-mono text-xs text-white border-b border-white pb-1"
        >
          Overview
        </Link>
        <Link
          href="/dashboard/billing/transactions"
          className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Transactions
        </Link>
        <Link
          href="/dashboard/billing/settings"
          className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Settings
        </Link>
      </div>

      {!authenticated ? (
        <form onSubmit={handleAuth} className="max-w-md space-y-6">
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Provider API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="bz_..."
              required
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
        </form>
      ) : summary ? (
        <div className="space-y-8">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            {["7d", "30d", "90d", "all"].map((p) => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={`font-mono text-xs px-3 py-1.5 rounded transition-colors ${
                  period === p
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/30 border border-white/[0.06] hover:text-white/50"
                }`}
              >
                {p === "all" ? "All Time" : p}
              </button>
            ))}
          </div>

          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Gross Revenue"
              value={summary.earnings.gross_revenue}
              sub={`${summary.by_tool.reduce((s, t) => s + t.calls, 0)} total calls`}
            />
            <StatCard
              label="Net Earnings"
              value={summary.earnings.net_earnings}
              sub={`After ${summary.earnings.platform_fee} platform fee`}
            />
            <StatCard
              label="Pending Payout"
              value={summary.payout.pending_balance}
              sub={
                summary.payout.last_payout_date
                  ? `Last paid: ${new Date(summary.payout.last_payout_date).toLocaleDateString()}`
                  : "No payouts yet"
              }
            />
            <StatCard
              label="Avg per Call"
              value={cents(
                summary.by_tool.reduce((s, t) => s + t.calls, 0) > 0
                  ? Math.round(
                      summary.earnings.gross_revenue_cents /
                        summary.by_tool.reduce((s, t) => s + t.calls, 0)
                    )
                  : 0
              )}
              sub="Gross per invocation"
            />
          </div>

          {/* Revenue Chart */}
          {summary.by_week.length > 0 && (
            <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-white/40 uppercase tracking-wider">
                  Revenue by Week
                </span>
              </div>
              <MiniChart data={summary.by_week} />
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[10px] text-white/20">
                  {summary.by_week[0]?.week_of}
                </span>
                <span className="font-mono text-[10px] text-white/20">
                  {summary.by_week[summary.by_week.length - 1]?.week_of}
                </span>
              </div>
            </div>
          )}

          {/* Top Tools */}
          {summary.by_tool.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-white/40 uppercase tracking-wider">
                  Revenue by Tool
                </span>
                <button
                  onClick={exportCSV}
                  className="font-mono text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
                >
                  Export CSV
                </button>
              </div>
              <div className="border border-white/[0.08] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                        Tool
                      </th>
                      <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                        Calls
                      </th>
                      <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                        Gross
                      </th>
                      <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.by_tool.map((tool) => (
                      <tr
                        key={tool.tool}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="font-mono text-xs text-white/70 px-4 py-3">
                          {tool.tool}
                        </td>
                        <td className="font-mono text-xs text-white/40 text-right px-4 py-3">
                          {tool.calls.toLocaleString()}
                        </td>
                        <td className="font-mono text-xs text-white/40 text-right px-4 py-3">
                          {cents(tool.gross_cents)}
                        </td>
                        <td className="font-mono text-xs text-emerald-400/70 text-right px-4 py-3">
                          {cents(tool.net_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-white/[0.06]">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </div>
    </div>
  );
}
