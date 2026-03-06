"use client";

import { useState } from "react";

interface HumansTxtResult {
  url: string;
  status: "found" | "not_found" | "invalid" | "error";
  data?: Record<string, unknown>;
  error?: string;
  responseTime?: number;
  checks: {
    label: string;
    status: "pass" | "fail" | "warn";
    detail: string;
  }[];
  score: number;
}

function StatusBadge({ status }: { status: "pass" | "fail" | "warn" }) {
  const styles = {
    pass: "text-green-400 bg-green-400/10 border-green-400/30",
    fail: "text-red-400 bg-red-400/10 border-red-400/30",
    warn: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  };
  const icons = { pass: "✓", fail: "✗", warn: "!" };
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 border font-mono text-xs ${styles[status]}`}
    >
      {icons[status]}
    </span>
  );
}

async function validateUrl(url: string): Promise<HumansTxtResult> {
  const checks: HumansTxtResult["checks"] = [];
  let score = 0;
  const start = Date.now();

  // Normalize URL
  let baseUrl = url.trim();
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  baseUrl = baseUrl.replace(/\/+$/, "");
  const humansTxtUrl = `${baseUrl}/.well-known/humans.txt`;

  try {
    const res = await fetch(`/api/validate-humans-txt?url=${encodeURIComponent(humansTxtUrl)}`);
    const responseTime = Date.now() - start;

    if (!res.ok) {
      return {
        url: humansTxtUrl,
        status: "not_found",
        responseTime,
        checks: [
          {
            label: "/.well-known/humans.txt exists",
            status: "fail",
            detail: `HTTP ${res.status} — no humans.txt found at this URL`,
          },
        ],
        score: 0,
      };
    }

    const data = await res.json();

    // Check: exists
    checks.push({
      label: "/.well-known/humans.txt exists",
      status: "pass",
      detail: `Found at ${humansTxtUrl}`,
    });
    score += 20;

    // Check: valid JSON
    if (typeof data === "object" && data !== null) {
      checks.push({
        label: "Valid JSON response",
        status: "pass",
        detail: "Response is valid JSON",
      });
      score += 10;
    }

    // Check: platform info
    if (data.platform?.name) {
      checks.push({
        label: "Platform identified",
        status: "pass",
        detail: `Platform: ${data.platform.name}`,
      });
      score += 10;
    } else {
      checks.push({
        label: "Platform identified",
        status: "fail",
        detail: "Missing platform.name",
      });
    }

    // Check: operator name
    if (data.operator?.name) {
      checks.push({
        label: "Operator name",
        status: "pass",
        detail: `Operator: ${data.operator.name}`,
      });
      score += 15;
    } else {
      checks.push({
        label: "Operator name",
        status: "fail",
        detail: "Missing operator.name — who runs this?",
      });
    }

    // Check: verified human
    if (data.operator?.verifiedHuman === true) {
      checks.push({
        label: "Verified human",
        status: "pass",
        detail: "Operator claims verified human status",
      });
      score += 15;
    } else {
      checks.push({
        label: "Verified human",
        status: "warn",
        detail: "operator.verifiedHuman not set or false",
      });
    }

    // Check: contact info
    if (data.operator?.contact || data.operator?.github) {
      checks.push({
        label: "Contact information",
        status: "pass",
        detail: data.operator.github
          ? `GitHub: ${data.operator.github}`
          : `Contact: ${data.operator.contact}`,
      });
      score += 10;
    } else {
      checks.push({
        label: "Contact information",
        status: "fail",
        detail: "No contact or GitHub link — no accountability path",
      });
    }

    // Check: trust section
    if (data.trust) {
      const trustItems = [];
      if (data.trust.openSource) trustItems.push("open source");
      if (data.trust.billingSpec) trustItems.push(data.trust.billingSpec);
      if (data.trust.vendorCapture === false) trustItems.push("no vendor capture");

      checks.push({
        label: "Trust declarations",
        status: trustItems.length > 0 ? "pass" : "warn",
        detail:
          trustItems.length > 0
            ? `Declares: ${trustItems.join(", ")}`
            : "Trust section exists but empty",
      });
      score += 10;
    } else {
      checks.push({
        label: "Trust declarations",
        status: "warn",
        detail: "No trust section — consider adding open source / licensing info",
      });
    }

    // Check: human message
    if (data.message) {
      checks.push({
        label: "Human message",
        status: "pass",
        detail:
          data.message.length > 100
            ? `"${data.message.slice(0, 100)}..."`
            : `"${data.message}"`,
      });
      score += 10;
    } else {
      checks.push({
        label: "Human message",
        status: "warn",
        detail: "No message field — a personal note builds trust",
      });
    }

    return {
      url: humansTxtUrl,
      status: "found",
      data,
      responseTime,
      checks,
      score: Math.min(score, 100),
    };
  } catch (err) {
    return {
      url: humansTxtUrl,
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      responseTime: Date.now() - start,
      checks: [
        {
          label: "/.well-known/humans.txt exists",
          status: "fail",
          detail: "Could not reach the URL — check that the domain is correct",
        },
      ],
      score: 0,
    };
  }
}

export default function ValidatePage() {
  const [url, setUrl] = useState("noui.bot");
  const [result, setResult] = useState<HumansTxtResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await validateUrl(url);
    setResult(res);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="font-mono text-white/20 text-xs mb-4">
          <a href="/" className="hover:text-green-400">
            noui.bot
          </a>{" "}
          /{" "}
          <a href="/humans" className="hover:text-green-400">
            humans
          </a>{" "}
          / validate
        </div>
        <h1 className="font-mono text-3xl md:text-4xl font-bold text-green-400 mb-4">
          humans.txt validator
        </h1>
        <p className="text-white/50 max-w-xl">
          Check if a website publishes accountability metadata. Paste any URL to
          see if there&apos;s a verified human behind the service.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleValidate} className="mb-10">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-green-400 text-sm">
              $
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="w-full bg-white/5 border border-white/10 text-white font-mono text-sm px-8 py-3 focus:outline-none focus:border-green-400/50 placeholder:text-white/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="font-mono text-sm bg-green-400 text-black px-6 py-3 hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? "checking..." : "validate"}
          </button>
        </div>
        <div className="font-mono text-xs text-white/20 mt-2">
          Checks /.well-known/humans.txt for operator identity and trust metadata
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score */}
          <div className="bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-xs text-white/30 mb-1">
                  TRUST SCORE
                </div>
                <div
                  className={`font-mono text-4xl font-bold ${
                    result.score >= 70
                      ? "text-green-400"
                      : result.score >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {result.score}/100
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-white/30 mb-1">URL</div>
                <div className="font-mono text-sm text-white/50 break-all">
                  {result.url}
                </div>
                {result.responseTime && (
                  <div className="font-mono text-xs text-white/20 mt-1">
                    {result.responseTime}ms
                  </div>
                )}
              </div>
            </div>

            {/* Score bar */}
            <div className="w-full h-2 bg-white/5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  result.score >= 70
                    ? "bg-green-400"
                    : result.score >= 40
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>

          {/* Checks */}
          <div className="bg-white/5 border border-white/10 p-6">
            <div className="font-mono text-xs text-white/30 mb-4">
              VALIDATION CHECKS
            </div>
            <div className="space-y-3">
              {result.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3">
                  <StatusBadge status={check.status} />
                  <div className="flex-1">
                    <div className="font-mono text-sm text-white">
                      {check.label}
                    </div>
                    <div className="font-mono text-xs text-white/40 mt-0.5">
                      {check.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw data */}
          {result.data && (
            <div className="bg-white/5 border border-white/10 p-6">
              <div className="font-mono text-xs text-white/30 mb-4">
                RAW RESPONSE
              </div>
              <pre className="font-mono text-xs text-green-400/70 overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}

          {/* No humans.txt */}
          {result.status === "not_found" && (
            <div className="bg-white/5 border border-yellow-400/20 p-6">
              <div className="font-mono text-sm text-yellow-400 mb-2">
                No humans.txt found
              </div>
              <p className="text-white/50 text-sm mb-4">
                This URL doesn&apos;t publish accountability metadata. Consider
                adding a humans.txt to build trust with agents and their operators.
              </p>
              <a
                href="/blog/why-humans-txt-matters"
                className="font-mono text-sm text-green-400 hover:underline"
              >
                Learn why humans.txt matters →
              </a>
            </div>
          )}

          {/* Add your own CTA */}
          <div className="text-center pt-4">
            <p className="text-white/30 text-sm mb-3">
              Want to add humans.txt to your service?
            </p>
            <a
              href="/blog/why-humans-txt-matters"
              className="font-mono text-sm text-green-400 hover:underline"
            >
              Read the spec →
            </a>
          </div>
        </div>
      )}

      {/* Pre-seeded examples */}
      {!result && !loading && (
        <div className="space-y-4">
          <div className="font-mono text-xs text-white/30">
            TRY THESE
          </div>
          {[
            { domain: "noui.bot", label: "Agent Bazaar (has humans.txt)" },
            { domain: "github.com", label: "GitHub (no humans.txt)" },
            { domain: "stripe.com", label: "Stripe (no humans.txt)" },
          ].map((example) => (
            <button
              key={example.domain}
              onClick={() => {
                setUrl(example.domain);
                setResult(null);
              }}
              className="block w-full text-left bg-white/5 border border-white/10 p-3 hover:border-green-400/20 transition-colors"
            >
              <div className="font-mono text-sm text-white">
                {example.domain}
              </div>
              <div className="font-mono text-xs text-white/30">
                {example.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-white/10 text-center">
        <p className="font-mono text-white/20 text-xs">
          <a href="/humans" className="hover:text-green-400">
            humans.txt
          </a>{" "}
          — because trust starts with knowing who you&apos;re dealing with
        </p>
      </div>
    </main>
  );
}
