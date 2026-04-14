"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";

interface Transaction {
  id: string;
  status: string;
  amount_cents: number;
  net_cents: number;
  consumer_id: string | null;
  agent: string;
  latency_ms: number | null;
  created_at: string;
}

interface BillingData {
  provider: { id: string; name: string };
  transactions: Transaction[];
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

type SortField = "date" | "amount" | "agent" | "status";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = ["all", "succeeded", "failed", "refunded", "timeout"] as const;
const PAGE_SIZE = 25;

export default function TransactionsPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<BillingData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (key: string) => {
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
    fetchData(apiKey);
  }

  // Filtering + sorting
  const filtered = useMemo(() => {
    if (!data) return [];

    let result = data.transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.agent.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.consumer_id && t.consumer_id.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "amount":
          cmp = a.amount_cents - b.amount_cents;
          break;
        case "agent":
          cmp = a.agent.localeCompare(b.agent);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [data, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  function exportCSV() {
    const rows = [
      ["ID", "Agent", "Status", "Amount", "Net", "User ID", "Latency (ms)", "Date"],
      ...filtered.map((t) => [
        t.id,
        t.agent,
        t.status,
        cents(t.amount_cents),
        cents(t.net_cents),
        t.consumer_id || "",
        t.latency_ms?.toString() || "",
        new Date(t.created_at).toISOString(),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stripe-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Summary stats for the filtered set
  const filteredStats = useMemo(() => {
    const succeeded = filtered.filter((t) => t.status === "succeeded");
    const gross = succeeded.reduce((s, t) => s + t.amount_cents, 0);
    return {
      count: filtered.length,
      succeeded: succeeded.length,
      failed: filtered.filter((t) => t.status === "failed").length,
      gross,
      avg: succeeded.length > 0 ? Math.round(gross / succeeded.length) : 0,
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16">
      <Link
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </Link>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Transactions
      </h1>
      <p className="text-white/40 font-mono text-sm mb-8">
        Searchable, filterable transaction history with CSV export.
      </p>

      {/* Nav */}
      <div className="flex gap-4 mb-12 border-b border-white/[0.06] pb-4">
        <Link
          href="/dashboard/billing"
          className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Overview
        </Link>
        <Link
          href="/dashboard/billing/transactions"
          className="font-mono text-xs text-white border-b border-white pb-1"
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
            {loading ? "Loading..." : "View Transactions"}
          </button>
        </form>
      ) : data ? (
        <div className="space-y-6">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search agent, ID, or user..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-1.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 pl-8"
              />
              <svg
                className="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>

            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(0);
                  }}
                  className={`font-mono text-xs px-3 py-1.5 rounded transition-colors ${
                    statusFilter === s
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-white/30 border border-white/[0.06] hover:text-white/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="font-mono text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors ml-auto disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-6 font-mono text-xs text-white/30">
            <span>
              {filteredStats.count} transaction{filteredStats.count !== 1 ? "s" : ""}
            </span>
            <span className="text-emerald-400/50">
              {filteredStats.succeeded} succeeded
            </span>
            {filteredStats.failed > 0 && (
              <span className="text-red-400/50">
                {filteredStats.failed} failed
              </span>
            )}
            <span>Gross: {cents(filteredStats.gross)}</span>
            <span>Avg: {cents(filteredStats.avg)}</span>
          </div>

          {/* Table */}
          <div className="border border-white/[0.08] rounded-lg overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th
                    onClick={() => toggleSort("agent")}
                    className="text-left font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white/50 select-none"
                  >
                    Agent{sortIndicator("agent")}
                  </th>
                  <th
                    onClick={() => toggleSort("status")}
                    className="text-left font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white/50 select-none"
                  >
                    Status{sortIndicator("status")}
                  </th>
                  <th
                    onClick={() => toggleSort("amount")}
                    className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white/50 select-none"
                  >
                    Amount{sortIndicator("amount")}
                  </th>
                  <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Net
                  </th>
                  <th className="text-left font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    User ID
                  </th>
                  <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Latency
                  </th>
                  <th
                    onClick={() => toggleSort("date")}
                    className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white/50 select-none"
                  >
                    Date{sortIndicator("date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center font-mono text-xs text-white/20 py-12"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  pageData.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="font-mono text-xs text-white/70 px-4 py-3">
                        <div>{t.agent}</div>
                        <div className="text-[10px] text-white/20 mt-0.5">
                          {t.id.slice(0, 12)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            t.status === "succeeded"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : t.status === "failed"
                                ? "bg-red-500/10 text-red-400"
                                : t.status === "refunded"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-white/50 text-right px-4 py-3">
                        {cents(t.amount_cents)}
                      </td>
                      <td className="font-mono text-xs text-emerald-400/60 text-right px-4 py-3">
                        {cents(t.net_cents)}
                      </td>
                      <td className="font-mono text-[10px] text-white/30 px-4 py-3">
                        {t.consumer_id
                          ? `${t.consumer_id.slice(0, 8)}...`
                          : "\u2014"}
                      </td>
                      <td className="font-mono text-xs text-white/30 text-right px-4 py-3">
                        {t.latency_ms ? `${t.latency_ms}ms` : "\u2014"}
                      </td>
                      <td className="font-mono text-xs text-white/30 text-right px-4 py-3 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}{" "}
                        <span className="text-white/15">
                          {new Date(t.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-white/20">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="font-mono text-xs px-3 py-1.5 rounded border border-white/[0.08] text-white/40 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="font-mono text-xs px-3 py-1.5 rounded border border-white/[0.08] text-white/40 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-16 pt-8 border-t border-white/[0.06]">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </div>
    </div>
  );
}
