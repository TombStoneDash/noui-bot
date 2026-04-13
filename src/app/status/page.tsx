"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface HealthData {
  status: string;
  provider_count: number;
  tool_count: number;
  uptime_seconds: number;
  timestamp: string;
}

interface CheckEntry {
  time: string;
  status: string;
  latencyMs: number;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState<CheckEntry[]>([]);
  const [lastCheck, setLastCheck] = useState<string>("");

  const checkHealth = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/bazaar/health");
      const latencyMs = Date.now() - start;
      const data = await res.json();
      setHealth(data);
      setError(false);
      setHistory((prev) => {
        const entry: CheckEntry = {
          time: new Date().toLocaleTimeString(),
          status: data.status,
          latencyMs,
        };
        return [entry, ...prev].slice(0, 20);
      });
    } catch {
      setError(true);
      setHealth(null);
      setHistory((prev) => {
        const entry: CheckEntry = {
          time: new Date().toLocaleTimeString(),
          status: "unreachable",
          latencyMs: Date.now() - start,
        };
        return [entry, ...prev].slice(0, 20);
      });
    } finally {
      setLoading(false);
      setLastCheck(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const statusColor = error
    ? "text-red-400"
    : health?.status === "ok"
      ? "text-emerald-400"
      : "text-amber-400";

  const statusBg = error
    ? "bg-red-500/10 border-red-500/20"
    : health?.status === "ok"
      ? "bg-emerald-500/10 border-emerald-500/20"
      : "bg-amber-500/10 border-amber-500/20";

  const statusLabel = error
    ? "Unreachable"
    : health?.status === "ok"
      ? "All Systems Operational"
      : "Degraded";

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
          System Status
        </h1>
        <p className="text-white/40 font-mono text-sm">
          Real-time health for Agent Bazaar infrastructure.
        </p>
      </div>

      <div className="px-6 md:px-16 lg:px-24 py-12 max-w-3xl space-y-8">
        {/* Status Banner */}
        <div className={`border rounded-lg p-6 ${statusBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  error
                    ? "bg-red-400 animate-pulse"
                    : health?.status === "ok"
                      ? "bg-emerald-400"
                      : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className={`font-mono text-lg font-bold ${statusColor}`}>
                {loading ? "Checking..." : statusLabel}
              </span>
            </div>
            <button
              onClick={checkHealth}
              className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Refresh
            </button>
          </div>
          {lastCheck && (
            <p className="font-mono text-xs text-white/20 mt-2">
              Last checked: {lastCheck} &middot; Auto-refreshes every 30s
            </p>
          )}
        </div>

        {/* Metrics */}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
              <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
                Status
              </div>
              <div className={`font-mono text-lg font-bold ${statusColor}`}>
                {health.status}
              </div>
            </div>
            <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
              <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
                Providers
              </div>
              <div className="font-mono text-lg font-bold text-white">
                {health.provider_count}
              </div>
            </div>
            <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
              <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
                Tools
              </div>
              <div className="font-mono text-lg font-bold text-white">
                {health.tool_count}
              </div>
            </div>
            <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
              <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
                Uptime
              </div>
              <div className="font-mono text-lg font-bold text-white">
                {formatUptime(health.uptime_seconds)}
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        <div>
          <h2 className="font-mono text-xs text-white/30 uppercase tracking-widest mb-4">
            Services
          </h2>
          <div className="space-y-2">
            {[
              { name: "Bazaar API", path: "/api/bazaar", status: health ? "operational" : error ? "down" : "checking" },
              { name: "Billing Proxy", path: "/api/bazaar/proxy", status: health ? "operational" : error ? "down" : "checking" },
              { name: "Tool Catalog", path: "/api/bazaar/catalog", status: health ? "operational" : error ? "down" : "checking" },
              { name: "Usage & Metering", path: "/api/bazaar/usage", status: health ? "operational" : error ? "down" : "checking" },
              { name: "Provider Registration", path: "/api/bazaar/register-provider", status: health ? "operational" : error ? "down" : "checking" },
            ].map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between py-3 px-4 border border-white/[0.06] rounded"
              >
                <div>
                  <span className="font-mono text-sm text-white/70">
                    {svc.name}
                  </span>
                  <span className="font-mono text-xs text-white/20 ml-2">
                    {svc.path}
                  </span>
                </div>
                <span
                  className={`font-mono text-xs ${
                    svc.status === "operational"
                      ? "text-emerald-400"
                      : svc.status === "down"
                        ? "text-red-400"
                        : "text-white/30"
                  }`}
                >
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Check History */}
        {history.length > 0 && (
          <div>
            <h2 className="font-mono text-xs text-white/30 uppercase tracking-widest mb-4">
              Recent Checks
            </h2>
            <div className="space-y-1">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded font-mono text-xs"
                >
                  <span className="text-white/30">{entry.time}</span>
                  <span
                    className={
                      entry.status === "ok"
                        ? "text-emerald-400"
                        : entry.status === "degraded"
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {entry.status}
                  </span>
                  <span className="text-white/20">{entry.latencyMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Endpoint */}
        <div className="border-t border-white/[0.06] pt-8">
          <h2 className="font-mono text-xs text-white/30 uppercase tracking-widest mb-4">
            API
          </h2>
          <p className="font-mono text-sm text-white/50 mb-2">
            Programmatic health check:
          </p>
          <pre className="bg-white/[0.03] border border-white/[0.06] rounded p-3 font-mono text-xs text-emerald-400/70 overflow-x-auto">
            curl https://noui.bot/api/bazaar/health
          </pre>
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
