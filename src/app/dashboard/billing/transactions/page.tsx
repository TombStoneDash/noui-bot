"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface LogEntry {
  id: string;
  status: string;
  cost_cents: number;
  latency_ms: number | null;
  created_at: string;
  tool: string;
}

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

export default function TransactionsPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async (key: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bazaar/usage?limit=500", {
        headers: { Authorization: `Bearer ${key}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Authentication failed");
        return;
      }

      const entries = (data.logs || []).map((l: any) => ({
        id: l.id,
        status: l.status,
        cost_cents: l.cost_cents || 0,
        latency_ms: l.latency_ms,
        created_at: l.created_at,
        tool: l.tool_name || l.tool_id || "unknown",
      }));

      setLogs(entries);
      setAuthenticated(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    fetchLogs(apiKey);
  }

  const filtered = logs.filter((l) => {
    const matchesSearch =
      !search ||
      l.tool.toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function exportCSV() {
    const rows = [
      ["ID", "Tool", "Status", "Amount", "Latency (ms)", "Date"],
      ...filtered.map((l) => [
        l.id,
        l.tool,
        l.status,
        cents(l.cost_cents),
        l.latency_ms?.toString() || "",
        new Date(l.created_at).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bazaar-transactions.csv";
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
        Transactions
      </h1>
      <p className="text-white/40 font-mono text-sm mb-8">
        Every metered tool call, searchable and exportable.
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
            {loading ? "Loading..." : "View Transactions →"}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <input
              type="text"
              placeholder="Search by tool or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-1.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 w-64"
            />
            <div className="flex gap-2">
              {["all", "success", "error", "timeout"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
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
              className="font-mono text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors ml-auto"
            >
              Export CSV
            </button>
          </div>

          <div className="font-mono text-xs text-white/30">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </div>

          {/* Table */}
          <div className="border border-white/[0.08] rounded-lg overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Tool
                  </th>
                  <th className="text-left font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Amount
                  </th>
                  <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Latency
                  </th>
                  <th className="text-right font-mono text-[10px] text-white/30 uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center font-mono text-xs text-white/20 py-8"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="font-mono text-xs text-white/70 px-4 py-3">
                        {l.tool}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            l.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : l.status === "error"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-white/40 text-right px-4 py-3">
                        {cents(l.cost_cents)}
                      </td>
                      <td className="font-mono text-xs text-white/30 text-right px-4 py-3">
                        {l.latency_ms ? `${l.latency_ms}ms` : "—"}
                      </td>
                      <td className="font-mono text-xs text-white/30 text-right px-4 py-3">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-16 pt-8 border-t border-white/[0.06]">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </div>
    </div>
  );
}
