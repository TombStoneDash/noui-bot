"use client";

import { useState } from "react";

interface RegistrationResult {
  provider_id: string;
  name: string;
  api_key: string;
  api_key_prefix: string;
  message: string;
}

export default function ProviderRegisterPage() {
  const [toolName, setToolName] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [pricingModel, setPricingModel] = useState("free");
  const [email, setEmail] = useState("");
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
          name: toolName.trim(),
          email: email.trim(),
          endpoint_url: githubUrl.trim(),
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
        Register Your MCP Server
      </h1>
      <p className="text-white/40 font-mono text-sm mb-12">
        List your tool on Agent Bazaar. Five fields. Takes 30 seconds.
      </p>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tool Name */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Tool Name *
            </label>
            <input
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g., Weather Lookup, Code Analyzer, PDF Parser"
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your MCP server do? One or two sentences."
              rows={3}
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {/* GitHub URL */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              GitHub URL *
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/your-org/your-mcp-server"
              required
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Pricing Model */}
          <div>
            <label className="font-mono text-xs text-white/50 uppercase tracking-wider block mb-2">
              Pricing Model *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "free", label: "Free", desc: "No charge" },
                { value: "per_call", label: "Per Call", desc: "Charge per invocation" },
                { value: "tiered", label: "Tiered", desc: "Free tier + paid tiers" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col p-4 border rounded cursor-pointer transition-colors ${
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
                  <span className="font-mono text-sm text-white/70">{option.label}</span>
                  <span className="font-mono text-[10px] text-white/30 mt-1">{option.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Contact Email */}
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
            {loading ? "Registering..." : "Register →"}
          </button>

          <div className="pt-8 border-t border-white/5">
            <p className="font-mono text-xs text-white/20">
              Your tool becomes discoverable in the Bazaar catalog immediately.
              <br />
              Bazaar takes a 10% platform fee on paid tool calls. Free tools incur no fees.
            </p>
          </div>
        </form>
      ) : (
        /* Registration Success */
        <div className="space-y-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <div className="font-mono text-green-400 text-sm mb-2">Registered</div>
            <div className="font-mono text-lg font-bold">{result.name}</div>
            <div className="font-mono text-xs text-white/40 mt-1">
              ID: {result.provider_id}
            </div>
          </div>

          {/* API Key */}
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
                {keyCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="font-mono text-xs text-red-400/70 mt-3">
              This key will not be shown again. Store it securely.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <a
              href="/providers/dashboard"
              className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors"
            >
              Go to Dashboard →
            </a>
            <a
              href="/providers"
              className="font-mono text-sm bg-white/10 text-white px-6 py-3 rounded hover:bg-white/20 transition-colors"
            >
              View All Providers
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
