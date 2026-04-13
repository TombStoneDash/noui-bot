"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "curl" | "javascript" | "python";

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center font-mono text-emerald-400 text-sm">
          {number}
        </span>
        <h3 className="font-mono text-sm font-medium text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      {label && (
        <span className="font-mono text-[10px] text-white/30 mb-1 block">
          {label}
        </span>
      )}
      <div className="relative">
        <pre className="bg-black/50 border border-white/[0.06] rounded p-3 text-xs text-white/60 font-mono overflow-x-auto whitespace-pre-wrap pr-16">
          {code}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors bg-black/50 px-2 py-1 rounded"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function LangTabs({
  snippets,
}: {
  snippets: Record<Lang, { code: string; label: string }>;
}) {
  const [lang, setLang] = useState<Lang>("javascript");
  const tabs: Lang[] = ["curl", "javascript", "python"];

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setLang(t)}
            className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
              lang === t
                ? "bg-white/10 text-white/70"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <CopyBlock code={snippets[lang].code} label={snippets[lang].label} />
    </div>
  );
}

export default function GettingStartedPage() {
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
          Getting Started
        </h1>
        <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed">
          From zero to your first metered API call in 5 steps.
        </p>
      </div>

      {/* Steps */}
      <div className="px-6 md:px-16 lg:px-24 py-12 space-y-6 max-w-3xl">
        <Step number="1" title="Install the SDK (optional)">
          <LangTabs
            snippets={{
              curl: {
                label: "No installation needed",
                code: "# cURL works out of the box — just use the REST API directly",
              },
              javascript: {
                label: "npm / yarn / pnpm",
                code: "npm install @forthebots/bazaar-sdk",
              },
              python: {
                label: "pip",
                code: "pip install requests  # Use requests for the REST API",
              },
            }}
          />
        </Step>

        <Step number="2" title="Get an API key">
          <LangTabs
            snippets={{
              curl: {
                label: "Register as a consumer",
                code: `curl -X POST https://noui.bot/api/bazaar/register-consumer \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Agent", "email": "you@example.com"}'`,
              },
              javascript: {
                label: "Register via SDK",
                code: `// Or register via the web form at /developers/register
const res = await fetch("https://noui.bot/api/bazaar/register-consumer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "My Agent", email: "you@example.com" }),
});
const { api_key } = await res.json();
console.log("Save this key:", api_key);`,
              },
              python: {
                label: "Register via requests",
                code: `import requests

res = requests.post("https://noui.bot/api/bazaar/register-consumer", json={
    "name": "My Agent",
    "email": "you@example.com"
})
data = res.json()
print("Save this key:", data["api_key"])`,
              },
            }}
          />
          <p className="font-mono text-xs text-white/30 mt-3">
            Free tier: 100 calls/month. No credit card required.
          </p>
          <Link
            href="/developers/register"
            className="inline-block mt-2 font-mono text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Or register with the web form
          </Link>
        </Step>

        <Step number="3" title="Browse available tools">
          <LangTabs
            snippets={{
              curl: {
                label: "List the catalog",
                code: `curl https://noui.bot/api/bazaar/catalog | jq '.tools[] | {name: .display_name, price: .pricing.price}'`,
              },
              javascript: {
                label: "Fetch catalog",
                code: `import { Bazaar } from "@forthebots/bazaar-sdk";

const bz = new Bazaar({ apiKey: "bz_your_key" });
const { tools } = await bz.catalog.list();
tools.forEach(t => console.log(t.display_name, t.pricing.price));`,
              },
              python: {
                label: "Fetch catalog",
                code: `import requests

res = requests.get("https://noui.bot/api/bazaar/catalog")
for tool in res.json()["tools"]:
    print(f"{tool['display_name']}: {tool['pricing']['price']}")`,
              },
            }}
          />
          <p className="font-mono text-xs text-white/30 mt-3">
            Or browse the{" "}
            <Link
              href="/marketplace"
              className="text-emerald-400 hover:text-emerald-300"
            >
              marketplace
            </Link>{" "}
            in your browser.
          </p>
        </Step>

        <Step number="4" title="Make your first API call">
          <LangTabs
            snippets={{
              curl: {
                label: "Call a tool through the proxy",
                code: `curl -X POST https://noui.bot/api/bazaar/proxy \\
  -H "Authorization: Bearer bz_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"tool_name": "web_search", "input": {"query": "MCP protocol"}}'`,
              },
              javascript: {
                label: "SDK call",
                code: `import { Bazaar } from "@forthebots/bazaar-sdk";

const bz = new Bazaar({ apiKey: "bz_your_key" });

const result = await bz.tools.call("web_search", {
  query: "latest MCP protocol updates"
});

console.log(result);`,
              },
              python: {
                label: "Python requests",
                code: `import requests

res = requests.post(
    "https://noui.bot/api/bazaar/proxy",
    headers={"Authorization": "Bearer bz_your_key"},
    json={
        "tool_name": "web_search",
        "input": {"query": "latest MCP protocol updates"}
    }
)
print(res.json())`,
              },
            }}
          />
          <p className="font-mono text-xs text-white/30 mt-3">
            The proxy handles auth, metering, billing, and retries automatically.
          </p>
        </Step>

        <Step number="5" title="Check your usage">
          <LangTabs
            snippets={{
              curl: {
                label: "View usage summary",
                code: `curl https://noui.bot/api/bazaar/usage/summary \\
  -H "Authorization: Bearer bz_your_key"`,
              },
              javascript: {
                label: "SDK usage",
                code: `const usage = await bz.usage.summary();
console.log(\`Calls: \${usage.total_calls}, Cost: \${usage.total_cost}\`);`,
              },
              python: {
                label: "Python requests",
                code: `res = requests.get(
    "https://noui.bot/api/bazaar/usage/summary",
    headers={"Authorization": "Bearer bz_your_key"}
)
usage = res.json()
print(f"Calls: {usage['total_calls']}, Cost: {usage['total_cost']}")`,
              },
            }}
          />
          <p className="font-mono text-xs text-white/30 mt-3">
            Or view your{" "}
            <Link
              href="/developers/dashboard"
              className="text-emerald-400 hover:text-emerald-300"
            >
              dashboard
            </Link>{" "}
            for real-time analytics.
          </p>
        </Step>
      </div>

      {/* Next Steps */}
      <div className="px-6 md:px-16 lg:px-24 py-12 border-t border-white/[0.06]">
        <h2 className="font-mono text-xs text-white/30 tracking-widest uppercase mb-6">
          Next Steps
        </h2>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl">
          <Link
            href="/providers"
            className="border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <h3 className="font-mono text-sm text-white mb-1">
              Browse Providers
            </h3>
            <p className="text-xs text-white/30">
              Discover tools from verified MCP providers
            </p>
          </Link>
          <Link
            href="/docs"
            className="border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <h3 className="font-mono text-sm text-white mb-1">Full API Docs</h3>
            <p className="text-xs text-white/30">
              Auth, error codes, rate limits, all endpoints
            </p>
          </Link>
          <Link
            href="/providers/register"
            className="border border-white/[0.08] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
          >
            <h3 className="font-mono text-sm text-white mb-1">
              Become a Provider
            </h3>
            <p className="text-xs text-white/30">
              List your tools and start earning
            </p>
          </Link>
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
