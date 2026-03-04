"use client";

import { useState, useCallback } from "react";

const CLIENTS = [
  {
    id: "claude",
    name: "Claude Desktop",
    icon: "⚡",
    file: "~/Library/Application Support/Claude/claude_desktop_config.json",
    fileWin: "%APPDATA%\\Claude\\claude_desktop_config.json",
    lang: "json",
    config: `{
  "mcpServers": {
    "bazaar": {
      "command": "npx",
      "args": ["-y", "@forthebots/mcp-server"],
      "env": {
        "BAZAAR_API_KEY": "bz_your_key_here"
      }
    }
  }
}`,
    note: "Merge into your existing config if you already have other MCP servers.",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    icon: "🏄",
    file: "~/.codeium/windsurf/mcp_config.json",
    lang: "json",
    config: `{
  "mcpServers": {
    "bazaar": {
      "command": "npx",
      "args": ["-y", "@forthebots/mcp-server"],
      "env": {
        "BAZAAR_API_KEY": "bz_your_key_here"
      }
    }
  }
}`,
    note: "Or add via Windsurf Settings → MCP Servers → Add Server.",
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "▶",
    file: "~/.cursor/mcp.json",
    lang: "json",
    config: `{
  "mcpServers": {
    "bazaar": {
      "command": "npx",
      "args": ["-y", "@forthebots/mcp-server"],
      "env": {
        "BAZAAR_API_KEY": "bz_your_key_here"
      }
    }
  }
}`,
    note: "Or add via Cursor Settings → Features → MCP Servers.",
  },
  {
    id: "continue",
    name: "Continue",
    icon: "↻",
    file: ".continue/mcpServers/bazaar.yaml",
    lang: "yaml",
    config: `# Agent Bazaar — metered MCP tools
# Docs: https://noui.bot/docs/bazaar
name: bazaar
command: npx
args:
  - "-y"
  - "@forthebots/mcp-server"
env:
  BAZAAR_API_KEY: bz_your_key_here`,
    note: "Place this file in your project's .continue/mcpServers/ directory.",
  },
  {
    id: "mcp-use-ts",
    name: "mcp-use (TypeScript)",
    icon: "📦",
    file: "your-agent.ts",
    lang: "typescript",
    config: `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Connect to Agent Bazaar
const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@forthebots/mcp-server"],
  env: {
    ...process.env,
    BAZAAR_API_KEY: "bz_your_key_here",
  },
});

const client = new Client(
  { name: "my-agent", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
console.log(\`\${tools.length} Bazaar tools available\`);

// Call a tool (metered + billed automatically)
const result = await client.callTool({
  name: "weather_forecast",
  arguments: { location: "San Francisco, CA" },
});

console.log(result);`,
    note: 'Install deps: npm install @modelcontextprotocol/sdk @forthebots/mcp-server',
  },
  {
    id: "mcp-use-py",
    name: "mcp-use (Python)",
    icon: "🐍",
    file: "your_agent.py",
    lang: "python",
    config: `from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import asyncio, os

async def main():
    # Connect to Agent Bazaar
    server = StdioServerParameters(
        command="npx",
        args=["-y", "@forthebots/mcp-server"],
        env={
            **os.environ,
            "BAZAAR_API_KEY": "bz_your_key_here",
        },
    )

    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # List available tools
            tools = await session.list_tools()
            print(f"{len(tools.tools)} Bazaar tools available")

            # Call a tool (metered + billed)
            result = await session.call_tool(
                "weather_forecast",
                arguments={"location": "San Francisco, CA"},
            )
            print(result)

asyncio.run(main())`,
    note: "Install deps: pip install mcp",
  },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] rounded text-[11px] font-mono text-white/50 hover:text-white/80 transition-all cursor-pointer"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

export default function InstallPage() {
  const [active, setActive] = useState("claude");
  const client = CLIENTS.find((c) => c.id === active) ?? CLIENTS[0];

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl mx-auto">
      {/* Header */}
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        ← noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
        Install
      </h1>
      <p className="text-white/40 font-mono text-sm mb-2 max-w-xl leading-relaxed">
        Connect your MCP client to Agent Bazaar in 30 seconds.
        Every tool call is metered, receipted, and billed transparently.
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full text-xs text-white/40 font-mono mb-10">
        <span>⏱</span> ~30 seconds
      </div>

      {/* Prerequisites */}
      <div className="mb-10 p-4 border border-white/[0.08] rounded-lg bg-white/[0.02]">
        <h2 className="font-mono text-sm text-white/60 mb-2">Before you start</h2>
        <p className="text-sm text-white/40 leading-relaxed">
          You need a Bazaar API key.{" "}
          <a
            href="/developers/register"
            className="text-white/70 underline underline-offset-4 hover:text-white transition-colors"
          >
            Register free
          </a>{" "}
          or run:
        </p>
        <div className="relative mt-3">
          <pre className="bg-black border border-white/[0.08] rounded p-3 pr-20 overflow-x-auto">
            <code className="font-mono text-xs text-green-400/80">
{`curl -X POST https://noui.bot/api/bazaar/register-consumer \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Agent","email":"you@example.com"}'`}
            </code>
          </pre>
          <CopyButton text={`curl -X POST https://noui.bot/api/bazaar/register-consumer \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"My Agent","email":"you@example.com"}'`} />
        </div>
        <p className="text-xs text-white/30 mt-2">
          Returns <code className="bg-white/5 px-1 rounded">bz_live_...</code> — replace <code className="bg-white/5 px-1 rounded">bz_your_key_here</code> in the config below.
        </p>
      </div>

      {/* Client Tabs */}
      <div className="mb-1">
        <h2 className="font-mono text-sm text-white/40 uppercase tracking-wider mb-4">
          Pick your client
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all cursor-pointer border ${
                active === c.id
                  ? "bg-white/[0.1] border-white/[0.2] text-white"
                  : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.1]"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Config Block */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-white/30">
            {client.file}
            {"fileWin" in client && client.fileWin && (
              <span className="text-white/20"> (Win: {client.fileWin})</span>
            )}
          </span>
          <span className="font-mono text-[10px] text-white/20 uppercase">
            {client.lang}
          </span>
        </div>
        <div className="relative">
          <pre className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 pr-20 overflow-x-auto">
            <code className="font-mono text-sm text-white/70 whitespace-pre leading-relaxed">
              {client.config}
            </code>
          </pre>
          <CopyButton text={client.config} />
        </div>
        {client.note && (
          <p className="text-xs text-white/30 mt-2 font-mono">
            💡 {client.note}
          </p>
        )}
      </div>

      {/* What happens next */}
      <div className="mt-12 mb-12">
        <h2 className="font-mono text-lg font-bold mb-6">What happens next</h2>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Tools appear in your client",
              desc: "Your MCP client discovers all Bazaar tools automatically. No extra setup.",
            },
            {
              step: "2",
              title: "Call any tool — billing is automatic",
              desc: "Free-tier tools work immediately (100 calls/tool). Paid tools deduct from your prepaid balance.",
            },
            {
              step: "3",
              title: "Every call gets a signed receipt",
              desc: "HMAC-SHA256 receipts for auditing. Check usage at /api/v1/bazaar/usage/summary.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex gap-4 items-start p-4 border border-white/[0.06] rounded-lg"
            >
              <div className="w-7 h-7 flex-shrink-0 bg-white/[0.05] border border-white/[0.1] rounded-full flex items-center justify-center font-mono text-xs text-white/60">
                {item.step}
              </div>
              <div>
                <h3 className="font-mono text-sm text-white/80 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HTTP Alternative */}
      <div className="mb-12 p-4 border border-white/[0.06] rounded-lg">
        <h3 className="font-mono text-sm text-white/60 mb-2">
          Alternative: Direct HTTP (no npm)
        </h3>
        <p className="text-xs text-white/40 mb-3">
          If your client supports HTTP-based MCP servers, skip npx entirely:
        </p>
        <div className="relative">
          <pre className="bg-black border border-white/[0.08] rounded p-3 pr-20 overflow-x-auto">
            <code className="font-mono text-xs text-white/60">
{`{
  "mcpServers": {
    "bazaar": {
      "url": "https://noui.bot/api/v1",
      "headers": {
        "Authorization": "Bearer bz_your_key_here"
      }
    }
  }
}`}
            </code>
          </pre>
          <CopyButton
            text={`{\n  "mcpServers": {\n    "bazaar": {\n      "url": "https://noui.bot/api/v1",\n      "headers": {\n        "Authorization": "Bearer bz_your_key_here"\n      }\n    }\n  }\n}`}
          />
        </div>
      </div>

      {/* Footer links */}
      <div className="border-t border-white/[0.06] pt-8">
        <h2 className="font-mono text-sm text-white/40 uppercase tracking-wider mb-4">
          Learn more
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "Quickstart Guide", href: "/docs/quickstart" },
            { name: "API Reference", href: "/docs/bazaar" },
            { name: "Tool Catalog", href: "/marketplace" },
            { name: "Billing Spec (MIT)", href: "/specs/mcp-billing-v1" },
            { name: "Monetize Your Server", href: "/docs/guides/monetize-mcp-server" },
            { name: "GitHub", href: "https://github.com/TombStoneDash/noui-bot" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center justify-between p-3 border border-white/[0.06] rounded hover:border-white/[0.12] transition-colors group"
            >
              <span className="font-mono text-sm text-white/60 group-hover:text-white transition-colors">
                {link.name}
              </span>
              <span className="text-white/20 group-hover:text-white/40 transition-colors">
                →
              </span>
            </a>
          ))}
        </div>
      </div>

      <footer className="mt-16 text-center">
        <p className="font-mono text-xs text-white/15">
          noui.bot — the commerce layer for AI agents
        </p>
      </footer>
    </div>
  );
}
