"use client";

import { useState, useEffect } from "react";

export function BazaarStatus() {
  const [status, setStatus] = useState<{ tools: number; providers: number } | null>(null);
  useEffect(() => {
    fetch("/api/bazaar/catalog")
      .then((r) => r.json())
      .then((d) => {
        const tools = d.tools?.length ?? 0;
        const providerSet = new Set(d.tools?.map((t: any) => t.provider?.id).filter(Boolean));
        setStatus({ tools, providers: providerSet.size });
      })
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div className="inline-flex items-center gap-3 font-mono text-xs text-white/40 border border-white/10 px-4 py-2">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span>
        {status.tools} tools live from {status.providers} provider{status.providers !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
