import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect Bazaar to Claude Desktop | noui.bot",
  description: "Step-by-step guide to using Bazaar-metered MCP tools through Claude Desktop.",
};

export default function ClaudeSetupPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">
        Connect Bazaar to Claude Desktop
      </h1>
      <p className="text-white/40 text-sm mb-12 max-w-2xl leading-relaxed">
        Use Bazaar-metered MCP tools directly from Claude Desktop, Cursor, or Windsurf.
        Every tool call is metered, receipted, and billed transparently.
      </p>

      <div className="space-y-12 text-sm text-white/70 leading-relaxed">
        {/* Step 1 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">1. Get Your API Key</h2>
          <p className="mb-4">Register as a consumer (agent developer) to get a Bazaar API key:</p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`curl -X POST https://noui.bot/api/bazaar/register-consumer \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Agent", "email": "dev@example.com"}'

# Returns: { "api_key": "bz_abc123..." }`}
          </pre>
          <p className="mt-4 text-white/40">
            Or register at{" "}
            <a href="/developers/register" className="text-blue-400 hover:underline">
              noui.bot/developers/register
            </a>
          </p>
        </section>

        {/* Step 2 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">2. Configure Claude Desktop</h2>
          <p className="mb-4">
            Add the noui.bot MCP server to your Claude Desktop config file:
          </p>
          <p className="mb-2 text-white/40 text-xs font-mono">
            macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`{
  "mcpServers": {
    "noui-bazaar": {
      "command": "npx",
      "args": ["-y", "@forthebots/mcp-server"],
      "env": {
        "NOUI_API_KEY": "bz_your_key_here"
      }
    }
  }
}`}
          </pre>
          <p className="mt-4 text-white/40">
            Or connect directly via HTTP (no npm required):
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`{
  "mcpServers": {
    "noui-bazaar": {
      "url": "https://noui.bot/api/v1",
      "headers": {
        "Authorization": "Bearer bz_your_key_here"
      }
    }
  }
}`}
          </pre>
        </section>

        {/* Step 3 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">3. Load Balance</h2>
          <p className="mb-4">Pre-fund your account to start calling paid tools:</p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`# Load $5.00 balance (Stripe Checkout)
curl -X POST https://noui.bot/api/bazaar/balance/load \\
  -H "Authorization: Bearer bz_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"amount_cents": 500}'

# Check balance
curl https://noui.bot/api/v1/bazaar/balance \\
  -H "Authorization: Bearer bz_your_key"`}
          </pre>
        </section>

        {/* Step 4 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">4. Use Tools</h2>
          <p className="mb-4">
            Once configured, Claude can discover and call Bazaar tools directly:
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <p className="text-white/60 text-xs mb-2">Example Claude conversation:</p>
            <p className="text-blue-300 text-xs mb-1">&gt; Check the wallet balance for 0xAgent1</p>
            <p className="text-green-300 text-xs mb-1">🔧 Calling wallet.balance via Bazaar...</p>
            <p className="text-white/50 text-xs">USDC: 142.50 | ETH: 0.0847 | Cost: $0.05 | Receipt: rcpt_a1b2c3d4</p>
          </div>
        </section>

        {/* Step 5 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">5. Monitor Usage</h2>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`# View usage summary
curl https://noui.bot/api/v1/bazaar/usage/summary \\
  -H "Authorization: Bearer bz_your_key"

# Verify any receipt
curl https://noui.bot/api/v1/bazaar/receipts/rcpt_a1b2c3d4

# Check provider trust score
curl https://noui.bot/api/v1/bazaar/providers/{provider_id}/trust`}
          </pre>
        </section>

        {/* Also Works With */}
        <section className="border-t border-white/10 pt-8">
          <h2 className="font-mono text-lg text-white/90 mb-4">Also Works With</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Cursor</h3>
              <p className="text-xs text-white/40">Same config as Claude Desktop. Add to MCP settings in Cursor preferences.</p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Windsurf</h3>
              <p className="text-xs text-white/40">Add MCP server in Windsurf settings → MCP Servers.</p>
            </div>
            <a href="/docs/guides/langchain-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-2">LangChain</h3>
              <p className="text-xs text-white/40">MCP tools as LangChain StructuredTools.</p>
            </a>
            <a href="/docs/guides/crewai-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-2">CrewAI</h3>
              <p className="text-xs text-white/40">Multi-agent crews with Bazaar tools.</p>
            </a>
            <a href="/docs/guides/autogen-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-2">AutoGen</h3>
              <p className="text-xs text-white/40">Microsoft AutoGen + Bazaar tools.</p>
            </a>
          </div>
        </section>
      </div>

      <footer className="mt-16 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          <a href="/api/v1" className="text-blue-400/50 hover:text-blue-400">API Index</a>
          {" · "}
          <a href="/docs/bazaar" className="text-blue-400/50 hover:text-blue-400">Bazaar Docs</a>
          {" · "}
          <a href="/docs/compare" className="text-blue-400/50 hover:text-blue-400">Compare</a>
          {" · "}
          <a href="/specs/mcp-billing-v1" className="text-blue-400/50 hover:text-blue-400">Billing Spec</a>
        </p>
      </footer>
    </div>
  );
}
