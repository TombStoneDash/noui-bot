"use client";

import { useState } from "react";

interface RegistrationResult {
  consumer_id: string;
  name: string;
  api_key: string;
  api_key_prefix: string;
  balance: string;
  rate_limit_rpm: number;
  message: string;
}

export default function DeveloperRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/bazaar/register-consumer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (result?.api_key) {
      navigator.clipboard.writeText(result.api_key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Register as Developer
      </h1>
      <p className="text-white/40 font-mono text-sm mb-12">
        Get an API key. Call any tool in the Bazaar catalog.
      </p>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Name / Organization *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My AI Agent, Acme Corp"
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Use Case (optional)
            </label>
            <textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="What are you building? What tools does your agent need?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
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
            className="font-mono text-sm bg-white text-black px-8 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "Registering..." : "Get API Key →"}
          </button>

          <div className="pt-8 border-t border-white/5">
            <p className="font-mono text-xs text-white/20">
              Free tier includes 100 calls/month. No credit card required.
              <br />
              Rate limit: 60 requests per minute.
            </p>
          </div>
        </form>
      ) : (
        <div className="space-y-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="font-mono text-green-400 text-sm mb-2">✓ Registered</div>
            <div className="font-mono text-lg font-bold">{result.name}</div>
            <div className="font-mono text-xs text-white/40 mt-1">
              Balance: {result.balance} · Rate limit: {result.rate_limit_rpm} RPM
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="font-mono text-xs text-white/50 uppercase tracking-wider mb-3">
              Your API Key — save this now
            </div>
            <div className="flex items-center gap-3">
              <code className="font-mono text-sm bg-black border border-white/10 rounded px-3 py-2 flex-1 overflow-x-auto">
                {result.api_key}
              </code>
              <button
                onClick={copyKey}
                className="font-mono text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors whitespace-nowrap"
              >
                {keyCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="font-mono text-xs text-red-400/70 mt-3">
              ⚠ This key will not be shown again. Store it securely.
            </p>
          </div>

          {/* Quick Start Guide */}
          <div>
            <h2 className="font-mono text-sm text-white/50 uppercase tracking-wider mb-4">
              Quick Start
            </h2>
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded p-4">
                <div className="font-mono text-xs text-white/50 mb-2">
                  1. Browse available tools
                </div>
                <pre className="font-mono text-xs text-white/80 overflow-x-auto">{`curl https://noui.bot/api/bazaar/catalog | jq '.tools[] | {name: .tool_name, price: .pricing.price}'`}</pre>
              </div>

              <div className="bg-white/5 border border-white/10 rounded p-4">
                <div className="font-mono text-xs text-white/50 mb-2">
                  2. Call a tool through the proxy
                </div>
                <pre className="font-mono text-xs text-white/80 overflow-x-auto whitespace-pre-wrap">{`curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer ${result.api_key_prefix}" \\
  -H "Content-Type: application/json" \\
  -d '{"tool_id": "TOOL_UUID", "input": {"query": "test"}}'`}</pre>
              </div>

              <div className="bg-white/5 border border-white/10 rounded p-4">
                <div className="font-mono text-xs text-white/50 mb-2">
                  3. Check your usage
                </div>
                <pre className="font-mono text-xs text-white/80 overflow-x-auto">{`curl https://noui.bot/api/bazaar/usage/summary \\
  -H "Authorization: Bearer ${result.api_key_prefix}"`}</pre>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <a
              href="/developers/dashboard"
              className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors"
            >
              Go to Dashboard →
            </a>
            <a
              href="/api/bazaar/catalog"
              className="font-mono text-sm bg-white/10 text-white px-6 py-3 rounded hover:bg-white/20 transition-colors"
            >
              Browse Catalog
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
