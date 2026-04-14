"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface RevenueStats {
  total_transactions: number;
  succeeded_count: number;
  failed_count: number;
  refunded_count: number;
  gross_revenue_cents: number;
  platform_fee_cents: number;
  net_revenue_cents: number;
  avg_transaction_cents: number;
}

interface DailyRevenue {
  date: string;
  gross_cents: number;
  net_cents: number;
  transactions: number;
  succeeded: number;
  failed: number;
}

interface BillingData {
  provider: { id: string; name: string };
  revenue: {
    all_time: RevenueStats;
    this_month: RevenueStats;
    this_week: RevenueStats;
  };
  daily_revenue: DailyRevenue[];
  stripe_account: {
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  } | null;
  config: {
    webhook_url: string | null;
    payout_balance_cents: number;
    payout_schedule: string;
  };
  platform_fee_rate: string;
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function compactCents(amount: number): string {
  if (amount >= 100_000) return `$${(amount / 100_000).toFixed(1)}k`;
  return cents(amount);
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald" | "red" | "amber" | "default";
}) {
  const accentMap = {
    emerald: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    default: "text-white",
  };
  const color = accentMap[accent || "default"];

  return (
    <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
      <div className="font-mono text-xs text-white/40 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
      {sub && (
        <div className="font-mono text-xs text-white/30 mt-1">{sub}</div>
      )}
    </div>
  );
}

function RevenueChart({
  data,
  hoveredDay,
  onHover,
}: {
  data: DailyRevenue[];
  hoveredDay: DailyRevenue | null;
  onHover: (day: DailyRevenue | null) => void;
}) {
  if (data.length === 0) return null;
  const maxGross = Math.max(...data.map((d) => d.gross_cents), 1);

  return (
    <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-white/40 uppercase tracking-wider">
          Revenue — Last 30 Days
        </span>
        {hoveredDay && (
          <span className="font-mono text-xs text-white/60">
            {hoveredDay.date} &mdash; {cents(hoveredDay.gross_cents)} gross
            &middot; {hoveredDay.transactions} txn
          </span>
        )}
      </div>

      {/* Bars */}
      <div className="flex items-end gap-[3px] h-32">
        {data.map((d, i) => {
          const pct = Math.max((d.gross_cents / maxGross) * 100, 2);
          const hasFailures = d.failed > 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end"
              onMouseEnter={() => onHover(d)}
              onMouseLeave={() => onHover(null)}
            >
              <div
                className={`rounded-t transition-colors cursor-default ${
                  hasFailures
                    ? "bg-amber-500/30 hover:bg-amber-500/50"
                    : "bg-emerald-500/30 hover:bg-emerald-500/50"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        <span className="font-mono text-[10px] text-white/20">
          {data[0]?.date.slice(5)}
        </span>
        <span className="font-mono text-[10px] text-white/20">
          {data[Math.floor(data.length / 2)]?.date.slice(5)}
        </span>
        <span className="font-mono text-[10px] text-white/20">
          {data[data.length - 1]?.date.slice(5)}
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3">
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/30">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/40" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/30">
          <span className="w-2 h-2 rounded-sm bg-amber-500/40" />
          Has failures
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded ${
        connected
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-white/5 text-white/30 border border-white/10"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? "bg-emerald-400" : "bg-white/20"
        }`}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

export default function BillingDashboardPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredDay, setHoveredDay] = useState<DailyRevenue | null>(null);

  const fetchBilling = useCallback(async (key: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bazaar/billing/stripe-summary", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Authentication failed");
        return;
      }

      setData(json);
      setAuthenticated(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    fetchBilling(apiKey);
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
        Revenue, transactions, and Stripe integration for agent operators.
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
            {loading ? "Loading..." : "View Dashboard"}
          </button>
        </form>
      ) : data ? (
        <div className="space-y-8">
          {/* Provider header + Stripe status */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-sm text-white/60">
                {data.provider.name}
              </span>
              <span className="font-mono text-xs text-white/20 ml-3">
                {data.provider.id.slice(0, 8)}...
              </span>
            </div>
            <StatusBadge connected={!!data.stripe_account?.charges_enabled} />
          </div>

          {/* Revenue summary — 3 time windows */}
          <div>
            <div className="font-mono text-xs text-white/40 uppercase tracking-wider mb-4">
              Revenue Overview
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="All Time Revenue"
                value={compactCents(data.revenue.all_time.gross_revenue_cents)}
                sub={`${data.revenue.all_time.total_transactions} transactions`}
                accent="emerald"
              />
              <StatCard
                label="This Month"
                value={cents(data.revenue.this_month.gross_revenue_cents)}
                sub={`${data.revenue.this_month.succeeded_count} succeeded, ${data.revenue.this_month.failed_count} failed`}
              />
              <StatCard
                label="This Week"
                value={cents(data.revenue.this_week.gross_revenue_cents)}
                sub={`${data.revenue.this_week.succeeded_count} succeeded`}
              />
            </div>
          </div>

          {/* Transaction metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Transactions"
              value={data.revenue.all_time.total_transactions.toLocaleString()}
              sub="All time"
            />
            <StatCard
              label="Avg Transaction"
              value={cents(data.revenue.all_time.avg_transaction_cents)}
              sub="Per succeeded call"
            />
            <StatCard
              label="Net Earnings"
              value={cents(data.revenue.all_time.net_revenue_cents)}
              sub={`After ${data.platform_fee_rate} platform fee`}
              accent="emerald"
            />
            <StatCard
              label="Pending Payout"
              value={cents(data.config.payout_balance_cents)}
              sub={`Schedule: ${data.config.payout_schedule}`}
            />
          </div>

          {/* Failure rate card */}
          {data.revenue.all_time.failed_count > 0 && (
            <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/[0.03]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-red-400/60 uppercase tracking-wider">
                    Failed Transactions
                  </span>
                  <div className="font-mono text-lg font-bold text-red-400 mt-1">
                    {data.revenue.all_time.failed_count}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-white/30">Failure rate</span>
                  <div className="font-mono text-lg font-bold text-red-400/70 mt-1">
                    {data.revenue.all_time.total_transactions > 0
                      ? `${((data.revenue.all_time.failed_count / data.revenue.all_time.total_transactions) * 100).toFixed(1)}%`
                      : "0%"}
                  </div>
                </div>
                {data.revenue.all_time.refunded_count > 0 && (
                  <div className="text-right">
                    <span className="font-mono text-xs text-white/30">Refunded</span>
                    <div className="font-mono text-lg font-bold text-amber-400/70 mt-1">
                      {data.revenue.all_time.refunded_count}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 30-day revenue chart */}
          <RevenueChart
            data={data.daily_revenue}
            hoveredDay={hoveredDay}
            onHover={setHoveredDay}
          />

          {/* Quick links */}
          <div className="flex gap-4 flex-wrap pt-4 border-t border-white/[0.06]">
            <Link
              href="/dashboard/billing/transactions"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              View all transactions
            </Link>
            <Link
              href="/dashboard/billing/settings"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Manage Stripe settings
            </Link>
            <Link
              href="/docs/guides/provider-quickstart"
              className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Provider docs
            </Link>
          </div>
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
