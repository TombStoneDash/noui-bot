"use client";

import { useState } from "react";

interface RegistrationResult {
  provider_id: string;
  name: string;
  api_key: string;
  api_key_prefix: string;
  tools_registered: number;
  message: string;
  next_steps: Record<string, string>;
}

export default function ProviderRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [description, setDescription] = useState("");
  const [pricingModel, setPricingModel] = useState("per_call");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [toolsJson, setToolsJson] = useState("");
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
      const res = await fetch("/api/bazaar/register-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          endpoint_url: endpointUrl.trim(),
          description: description.trim() || undefined,
          pricing_model: pricingModel,
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
        Register as Provider
      </h1>
      <p className="text-white/40 font-mono text-sm mb-12">
        List your MCP tools on Bazaar. Set pricing. Get paid.
      </p>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Provider Name */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Provider Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weather Tools, Code Analyzer"
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Contact Email *
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

          {/* MCP Server URL */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              MCP Server URL *
            </label>
            <input
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://your-server.com/mcp"
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
            <p className="font-mono text-xs text-white/20 mt-2">
              We&apos;ll proxy tool calls to this URL
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your MCP server do?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {/* Webhook URL */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/bazaar"
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
            <p className="font-mono text-xs text-white/20 mt-2">
              Optional. Receive notifications for tool calls, disputes, and payouts.
            </p>
          </div>

          {/* Initial Tools */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Initial Tools (JSON)
            </label>
            <textarea
              value={toolsJson}
              onChange={(e) => setToolsJson(e.target.value)}
              placeholder={`[{"tool_name": "my_tool", "description": "What it does", "category": "utility", "price_cents_override": 1}]`}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
            <p className="font-mono text-xs text-white/20 mt-2">
              Optional. Register tools now or add them later via the API. Categories: weather, search, code, data, comms, finance, utility, other.
            </p>
          </div>

          {/* Pricing Model */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Pricing Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "per_call", label: "Per Call", desc: "Charge per tool invocation" },
                { value: "per_token", label: "Per Token", desc: "Charge based on token usage" },
                { value: "flat_monthly", label: "Monthly", desc: "Flat monthly subscription" },
                { value: "free", label: "Free", desc: "No charge for tool calls" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col p-3 border rounded cursor-pointer transition-colors ${
                    pricingModel === option.value
                      ? "border-white/30 bg-white/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="pricing_model"
                    value={option.value}
                    checked={pricingModel === option.value}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-mono text-xs text-white/70">{option.label}</span>
                  <span className="font-mono text-[10px] text-white/30 mt-1">{option.desc}</span>
                </label>
              ))}
            </div>
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
            {loading ? "Registering..." : "Register Provider →"}
          </button>

          <div className="pt-8 border-t border-white/5">
            <p className="font-mono text-xs text-white/20">
              By registering, your tools become discoverable in the Bazaar catalog.
              <br />
              Bazaar takes a 10% platform fee on all paid tool calls.
              <br />
              Free tools incur no fees.
            </p>
          </div>
        </form>
      ) : (
        /* Registration Success */
        <div className="space-y-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="font-mono text-green-400 text-sm mb-2">✓ Registered</div>
            <div className="font-mono text-lg font-bold">{result.name}</div>
            <div className="font-mono text-xs text-white/40 mt-1">
              ID: {result.provider_id}
            </div>
          </div>

          {/* API Key — critical, show prominently */}
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

          {/* Next Steps */}
          <div>
            <h2 className="font-mono text-sm text-white/50 uppercase tracking-wider mb-4">
              Next Steps
            </h2>
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded p-4">
                <div className="font-mono text-xs text-white/50 mb-2">
                  1. Add your tools
                </div>
                <pre className="font-mono text-xs text-white/80 overflow-x-auto whitespace-pre-wrap">{`curl -X POST https://noui.bot/api/bazaar/tools \\
  -H "Authorization: Bearer ${result.api_key_prefix}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "tools": [{
      "tool_name": "my_tool",
      "description": "What it does",
      "category": "utility",
      "price_cents_override": 1
    }]
  }'`}</pre>
              </div>

              <div className="bg-white/5 border border-white/10 rounded p-4">
                <div className="font-mono text-xs text-white/50 mb-2">
                  2. View your tools in the catalog
                </div>
                <pre className="font-mono text-xs text-white/80 overflow-x-auto">{`curl https://noui.bot/api/bazaar/catalog | jq '.tools'`}</pre>
              </div>

              <div className="bg-white/5 border border-white/10 rounded p-4">
                <div className="font-mono text-xs text-white/50 mb-2">
                  3. Check your dashboard
                </div>
                <pre className="font-mono text-xs text-white/80 overflow-x-auto">{`→ noui.bot/providers/dashboard?key=${result.api_key_prefix}...`}</pre>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <a
              href="/providers/dashboard"
              className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors"
            >
              Go to Dashboard →
            </a>
            <a
              href="/api/bazaar/catalog"
              className="font-mono text-sm bg-white/10 text-white px-6 py-3 rounded hover:bg-white/20 transition-colors"
            >
              View Catalog
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
