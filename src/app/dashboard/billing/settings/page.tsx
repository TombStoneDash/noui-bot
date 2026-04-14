"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

interface SettingsData {
  provider: { id: string; name: string };
  stripe_account: StripeAccount | null;
  config: {
    webhook_url: string | null;
    payout_balance_cents: number;
    payout_schedule: string;
  };
}

export default function BillingSettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Key management state
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newKeyCopied, setNewKeyCopied] = useState(false);
  const [rotateError, setRotateError] = useState("");

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookCopied, setWebhookCopied] = useState(false);

  const fetchSettings = useCallback(async (key: string) => {
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
      setWebhookUrl(json.config?.webhook_url || "");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    fetchSettings(apiKey);
  }

  function maskKey(key: string): string {
    if (key.length <= 10) return key;
    return `${key.slice(0, 7)}${"*".repeat(24)}${key.slice(-4)}`;
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function copyNewKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setNewKeyCopied(true);
      setTimeout(() => setNewKeyCopied(false), 2000);
    }
  }

  async function rotateKey() {
    setRotating(true);
    setRotateError("");

    try {
      const res = await fetch("/api/bazaar/billing/rotate-key", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();

      if (!res.ok) {
        setRotateError(json.message || "Key rotation failed");
        return;
      }

      setNewKey(json.new_key);
      // Update the stored key so subsequent requests use it
      setApiKey(json.new_key);
      setRotateConfirm(false);
    } catch {
      setRotateError("Network error during key rotation");
    } finally {
      setRotating(false);
    }
  }

  function copyWebhookEndpoint() {
    const endpoint = `${window.location.origin}/api/webhooks/stripe`;
    navigator.clipboard.writeText(endpoint);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
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
            {loading ? "Verifying..." : "Access Settings"}
          </button>
        </form>
      ) : data ? (
        <div className="max-w-2xl space-y-12">
          {/* ───────── Stripe Connect ───────── */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              Stripe Connect
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              {data.stripe_account ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          data.stripe_account.charges_enabled
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <div>
                        <div className="font-mono text-sm text-white">
                          {data.stripe_account.charges_enabled
                            ? "Connected"
                            : "Pending setup"}
                        </div>
                        <div className="font-mono text-[10px] text-white/20 mt-0.5">
                          {data.stripe_account.id}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                        data.stripe_account.charges_enabled
                          ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
                          : "border-amber-500/20 text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {data.stripe_account.charges_enabled
                        ? "Active"
                        : "Incomplete"}
                    </span>
                  </div>

                  {/* Stripe account capabilities */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Charges",
                        ok: data.stripe_account.charges_enabled,
                      },
                      {
                        label: "Payouts",
                        ok: data.stripe_account.payouts_enabled,
                      },
                      {
                        label: "Details",
                        ok: data.stripe_account.details_submitted,
                      },
                    ].map((cap) => (
                      <div
                        key={cap.label}
                        className="flex items-center gap-2 font-mono text-xs"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cap.ok ? "bg-emerald-400" : "bg-white/20"
                          }`}
                        />
                        <span
                          className={cap.ok ? "text-white/60" : "text-white/25"}
                        >
                          {cap.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="font-mono text-xs text-white/25">
                    To disconnect or modify your Stripe account, contact{" "}
                    <a
                      href="mailto:support@noui.bot"
                      className="text-emerald-400/60 hover:text-emerald-400"
                    >
                      support@noui.bot
                    </a>
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-mono text-xs text-white/40 mb-4">
                    Connect your Stripe account to receive payouts for paid tool
                    calls. You&apos;ll be redirected to Stripe to complete onboarding.
                  </p>
                  <button className="font-mono text-sm bg-[#635BFF] hover:bg-[#635BFF]/80 text-white px-6 py-2.5 rounded transition-colors">
                    Connect with Stripe
                  </button>
                  <p className="font-mono text-[10px] text-white/20 mt-3">
                    Requires a Stripe account. No Stripe account yet?{" "}
                    <a
                      href="https://dashboard.stripe.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/40 hover:text-white/60"
                    >
                      Create one
                    </a>
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ───────── Webhook URL ───────── */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              Webhook Configuration
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] space-y-4">
              <div>
                <label className="font-mono text-[10px] text-white/30 uppercase tracking-wider block mb-2">
                  Stripe Webhook Endpoint (read-only)
                </label>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs bg-black border border-white/10 rounded px-3 py-2 flex-1 text-white/50 overflow-x-auto">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/webhooks/stripe`
                      : "/api/webhooks/stripe"}
                  </code>
                  <button
                    onClick={copyWebhookEndpoint}
                    className="font-mono text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                  >
                    {webhookCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="font-mono text-[10px] text-white/20 mt-2">
                  Add this URL in your{" "}
                  <a
                    href="https://dashboard.stripe.com/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white/60"
                  >
                    Stripe Webhook settings
                  </a>{" "}
                  to receive payment events.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <label className="font-mono text-[10px] text-white/30 uppercase tracking-wider block mb-2">
                  Your Notification Webhook
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhooks/bazaar"
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                />
                <p className="font-mono text-[10px] text-white/20 mt-2">
                  Receive POST notifications for tool calls, disputes, and
                  payout events.
                </p>
              </div>

              {/* Webhook events */}
              <div className="border-t border-white/[0.06] pt-4">
                <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-2">
                  Events we send
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    "checkout.session.completed",
                    "customer.subscription.updated",
                    "customer.subscription.deleted",
                    "tool.call.completed",
                    "tool.call.failed",
                    "payout.initiated",
                    "dispute.opened",
                    "dispute.resolved",
                  ].map((evt) => (
                    <div
                      key={evt}
                      className="font-mono text-[10px] text-white/20 py-0.5"
                    >
                      {evt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ───────── API Key Management ───────── */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              API Key Management
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] space-y-5">
              {/* Current key display */}
              <div>
                <label className="font-mono text-[10px] text-white/30 uppercase tracking-wider block mb-2">
                  Current API Key
                </label>
                <div className="flex items-center gap-3">
                  <code className="font-mono text-sm bg-black border border-white/10 rounded px-3 py-2 flex-1 overflow-x-auto text-white/60">
                    {showKey ? apiKey : maskKey(apiKey)}
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
              </div>

              {/* Rotate key */}
              <div className="border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-white/50">
                      Rotate API Key
                    </div>
                    <p className="font-mono text-[10px] text-white/20 mt-1 max-w-md">
                      Generates a new key and immediately revokes the current
                      one. Any active integrations using the old key will stop
                      working.
                    </p>
                  </div>

                  {!rotateConfirm ? (
                    <button
                      onClick={() => setRotateConfirm(true)}
                      className="font-mono text-xs text-red-400/60 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 px-4 py-2 rounded transition-colors"
                    >
                      Rotate Key
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-red-400/60">
                        Are you sure?
                      </span>
                      <button
                        onClick={rotateKey}
                        disabled={rotating}
                        className="font-mono text-xs text-white bg-red-500/80 hover:bg-red-500 px-4 py-2 rounded transition-colors disabled:opacity-50"
                      >
                        {rotating ? "Rotating..." : "Yes, rotate"}
                      </button>
                      <button
                        onClick={() => setRotateConfirm(false)}
                        className="font-mono text-xs text-white/30 hover:text-white/50 px-3 py-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {rotateError && (
                  <div className="font-mono text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mt-3">
                    {rotateError}
                  </div>
                )}

                {/* New key display after rotation */}
                {newKey && (
                  <div className="mt-4 border border-emerald-500/20 bg-emerald-500/[0.05] rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-xs text-emerald-400">
                        Key rotated successfully
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-amber-400/70">
                      Save this key now. It will not be shown again.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-black border border-emerald-500/20 rounded px-3 py-2 flex-1 text-emerald-400/80 overflow-x-auto">
                        {newKey}
                      </code>
                      <button
                        onClick={copyNewKey}
                        className="font-mono text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded transition-colors"
                      >
                        {newKeyCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ───────── Payout Info ───────── */}
          <section>
            <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
              Payout Information
            </h2>
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">
                    Pending Balance
                  </div>
                  <div className="font-mono text-xl font-bold text-white">
                    ${((data.config.payout_balance_cents || 0) / 100).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-1">
                    Payout Schedule
                  </div>
                  <div className="font-mono text-xl font-bold text-white capitalize">
                    {data.config.payout_schedule || "Monthly"}
                  </div>
                </div>
              </div>
              <p className="font-mono text-[10px] text-white/20 mt-4">
                Payouts are processed according to your schedule. Contact{" "}
                <a
                  href="mailto:support@noui.bot"
                  className="text-emerald-400/60 hover:text-emerald-400"
                >
                  support@noui.bot
                </a>{" "}
                to change your payout schedule.
              </p>
            </div>
          </section>
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
