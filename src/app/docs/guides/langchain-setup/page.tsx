import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Bazaar MCP Tools with LangChain | noui.bot",
  description:
    "Connect LangChain agents to Agent Bazaar's metered MCP tools. Per-call billing, receipts, and transparent pricing.",
  openGraph: {
    title: "LangChain + Agent Bazaar MCP Tools",
    description:
      "Give your LangChain agents access to monetized MCP tools via Agent Bazaar. Install, configure, and run in under 5 minutes.",
    type: "article",
  },
};

export default function LangChainSetupPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">
        Use Bazaar MCP Tools with LangChain
      </h1>
      <p className="text-white/40 text-sm mb-12 max-w-2xl leading-relaxed">
        Connect your LangChain agents to Agent Bazaar&apos;s metered MCP tool marketplace.
        Every tool call is priced, metered, and receipted — your agent pays only for what it uses.
      </p>

      <div className="space-y-12 text-sm text-white/70 leading-relaxed">
        {/* Prerequisites */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-1 text-white/60">
            <li>Python 3.10+</li>
            <li>A Bazaar API key (<a href="/developers/register" className="text-blue-400 hover:underline">get one here</a>)</li>
            <li>Funded Bazaar balance (<a href="/docs/guides/claude-setup" className="text-blue-400 hover:underline">see billing setup</a>)</li>
          </ul>
        </section>

        {/* Step 1 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">1. Install Dependencies</h2>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`pip install langchain langchain-openai mcp`}
          </pre>
          <p className="mt-4 text-white/40">
            The <code className="text-white/60">mcp</code> package provides the MCP client
            that connects to Bazaar&apos;s proxy endpoint.
          </p>
        </section>

        {/* Step 2 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">2. Set Environment Variables</h2>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`export NOUI_API_KEY="bz_your_key_here"
export OPENAI_API_KEY="sk-..."   # or any LLM provider`}
          </pre>
          <p className="mt-4 text-white/40">
            Or use a <code className="text-white/60">.env</code> file with{" "}
            <code className="text-white/60">python-dotenv</code>.
          </p>
        </section>

        {/* Step 3 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">3. Connect to Bazaar via MCP</h2>
          <p className="mb-4">
            Use the MCP client to connect to Bazaar&apos;s SSE proxy endpoint,
            then convert the discovered tools into LangChain-compatible tools:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`import os
import asyncio
import json
from mcp import ClientSession
from mcp.client.sse import sse_client
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate

BAZAAR_URL = "https://noui.bot/api/mcp/sse"
API_KEY = os.environ["NOUI_API_KEY"]


async def get_bazaar_tools(session: ClientSession) -> list[StructuredTool]:
    """Discover Bazaar MCP tools and wrap them as LangChain tools."""
    tools_result = await session.list_tools()
    lc_tools = []

    for tool in tools_result.tools:
        # Capture tool name for closure
        tool_name = tool.name

        async def _call(session=session, name=tool_name, **kwargs):
            result = await session.call_tool(name, arguments=kwargs)
            return json.dumps([c.text for c in result.content])

        lc_tools.append(
            StructuredTool.from_function(
                func=lambda **kw: asyncio.get_event_loop().run_until_complete(
                    _call(**kw)
                ),
                coroutine=lambda **kw: _call(**kw),
                name=tool.name,
                description=tool.description or "",
                # Accept any kwargs — Bazaar tools define their own schemas
            )
        )
    return lc_tools


async def main():
    headers = {"Authorization": f"Bearer {API_KEY}"}

    async with sse_client(BAZAAR_URL, headers=headers) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Convert MCP tools → LangChain tools
            tools = await get_bazaar_tools(session)
            print(f"Loaded {len(tools)} Bazaar tools")

            # Build a LangChain agent
            llm = ChatOpenAI(model="gpt-4o", temperature=0)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a helpful agent with access to "
                           "Bazaar MCP tools. Use them when needed."),
                ("human", "{input}"),
                ("placeholder", "{agent_scratchpad}"),
            ])

            agent = create_tool_calling_agent(llm, tools, prompt)
            executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

            result = await executor.ainvoke({
                "input": "Check the platform stats on noui.bot"
            })
            print(result["output"])


asyncio.run(main())`}
          </pre>
        </section>

        {/* Step 4 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">4. How Billing Works</h2>
          <p className="mb-4">
            Every tool call through Bazaar is metered transparently:
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <p className="text-white/60 text-xs mb-2">What happens on each tool call:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-white/50">
              <li>Your agent calls a Bazaar tool via MCP</li>
              <li>Bazaar checks your balance and the tool&apos;s per-call price</li>
              <li>The tool executes and returns results</li>
              <li>Your balance is debited and a receipt is issued</li>
            </ol>
          </div>
          <pre className="mt-4 bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`# Check your balance anytime
curl https://noui.bot/api/v1/bazaar/balance \\
  -H "Authorization: Bearer bz_your_key"

# View receipts
curl https://noui.bot/api/v1/bazaar/usage/summary \\
  -H "Authorization: Bearer bz_your_key"`}
          </pre>
        </section>

        {/* Step 5 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">5. Production Tips</h2>
          <div className="space-y-4">
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Connection Reuse</h3>
              <p className="text-xs text-white/40">
                Keep the MCP session open across multiple agent runs. The SSE connection
                is persistent — reconnecting on every call adds latency.
              </p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Error Handling</h3>
              <p className="text-xs text-white/40">
                Bazaar returns structured errors for insufficient balance, rate limits,
                and provider failures. Wrap tool calls in try/except for graceful fallback.
              </p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Cost Controls</h3>
              <p className="text-xs text-white/40">
                Set a per-session budget by checking balance before and after agent runs.
                Tools expose their price in the MCP tool metadata.
              </p>
            </div>
          </div>
        </section>

        {/* See Also */}
        <section className="border-t border-white/10 pt-8">
          <h2 className="font-mono text-lg text-white/90 mb-4">See Also</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/docs/guides/claude-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-2">Claude Desktop</h3>
              <p className="text-xs text-white/40">Native MCP integration with Claude.</p>
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
          <a href="/docs/guides/monetize-mcp-server" className="text-blue-400/50 hover:text-blue-400">Monetize Your Server</a>
        </p>
      </footer>
    </div>
  );
}
