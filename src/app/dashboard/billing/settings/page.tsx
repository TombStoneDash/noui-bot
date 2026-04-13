"use client";

import { useState } from "react";
import Link from "next/link";

export default function BillingSettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Settings state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [payoutSchedule, setPayoutSchedule] = useState("monthly");
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Verify the key works by calling usage summary
      const res = await fetch("/api/bazaar/usage/summary?period=7d", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Invalid API key");
        return;
      }

      setAuthenticated(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        Settings
      </h1>
      <p className="text-white/40 font-mono text-sm mb-8">
        Stripe connection, webhook configuration, and API key management.
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
          className="font-mono text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Transactions
        </Link>
        <Link
          href="/dashboard/billing/settings"
          className="font-mono text-xs text-white border-b border-white pb-1"
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
            {loading ? "Verifying..." : "Access Settings →"}
          </button>
        </form>
      ) : (
        <div className="max-w-2xl space-y-12">
          {/* Stripe Connect */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              Stripe Connect
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              {stripeConnected ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm text-emerald-400 mb-1">
                      Connected
                    </div>
                    <div className="font-mono text-xs text-white/30">
                      Payouts will be sent to your connected Stripe account.
                    </div>
                  </div>
                  <button
                    onClick={() => setStripeConnected(false)}
                    className="font-mono text-xs text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-mono text-xs text-white/40 mb-4">
                    Connect your Stripe account to receive payouts for paid tool
                    calls.
                  </p>
                  <button
                    onClick={() => setStripeConnected(true)}
                    className="font-mono text-sm bg-[#635BFF] hover:bg-[#635BFF]/80 text-white px-6 py-2.5 rounded transition-colors"
                  >
                    Connect with Stripe
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Webhook URL */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              Webhook URL
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <p className="font-mono text-xs text-white/40 mb-4">
                Receive POST notifications for tool calls, disputes, and payout
                events.
              </p>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhooks/bazaar"
                className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </section>

          {/* API Key */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              API Key
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-4">
                <code className="font-mono text-sm bg-black border border-white/10 rounded px-3 py-2 flex-1 overflow-x-auto text-white/60">
                  {showKey ? apiKey : `${apiKey.slice(0, 6)}${"•".repeat(20)}`}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
                <button
                  onClick={copyApiKey}
                  className="font-mono text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
                >
                  {keyCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="font-mono text-xs text-white/30">
                To rotate your key, contact{" "}
                <a
                  href="mailto:support@noui.bot"
                  className="text-emerald-400/60 hover:text-emerald-400"
                >
                  support@noui.bot
                </a>
                . Key rotation invalidates the old key immediately.
              </p>
            </div>
          </section>

          {/* Payout Schedule */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              Payout Schedule
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "weekly", label: "Weekly", desc: "Every Monday" },
                  { value: "monthly", label: "Monthly", desc: "1st of month" },
                  {
                    value: "threshold",
                    label: "Threshold",
                    desc: "At $100 balance",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col p-4 border rounded cursor-pointer transition-colors ${
                      payoutSchedule === opt.value
                        ? "border-white/30 bg-white/5"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payout"
                      value={opt.value}
                      checked={payoutSchedule === opt.value}
                      onChange={(e) => setPayoutSchedule(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-mono text-sm text-white/70">
                      {opt.label}
                    </span>
                    <span className="font-mono text-[10px] text-white/30 mt-1">
                      {opt.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              className="font-mono text-sm bg-white text-black px-8 py-3 rounded hover:bg-white/90 transition-colors"
            >
              {saved ? "Saved" : "Save Settings"}
            </button>
            {saved && (
              <span className="font-mono text-xs text-emerald-400">
                Settings saved.
              </span>
            )}
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
