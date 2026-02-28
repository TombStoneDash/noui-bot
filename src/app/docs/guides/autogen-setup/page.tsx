import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Bazaar MCP Tools with AutoGen | noui.bot",
  description:
    "Connect Microsoft AutoGen agents to Agent Bazaar's metered MCP tools. Per-call billing, receipts, and transparent pricing.",
  openGraph: {
    title: "AutoGen + Agent Bazaar MCP Tools",
    description:
      "Give your AutoGen agents access to monetized MCP tools via Agent Bazaar. Install, configure, and run in under 5 minutes.",
    type: "article",
  },
};

export default function AutoGenSetupPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">
        Use Bazaar MCP Tools with AutoGen
      </h1>
      <p className="text-white/40 text-sm mb-12 max-w-2xl leading-relaxed">
        Connect Microsoft AutoGen agents to Agent Bazaar&apos;s paid tool marketplace.
        Every tool call is priced, metered, and receipted — your agents pay only for what they use.
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
{`pip install autogen-agentchat autogen-ext[mcp]`}
          </pre>
          <p className="mt-4 text-white/40">
            AutoGen&apos;s <code className="text-white/60">autogen-ext[mcp]</code> package
            includes <code className="text-white/60">McpWorkbench</code>, which bridges
            MCP servers into AutoGen&apos;s tool system.
          </p>
        </section>

        {/* Step 2 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">2. Set Environment Variables</h2>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`export NOUI_API_KEY="bz_your_key_here"
export OPENAI_API_KEY="sk-..."   # or Azure OpenAI credentials`}
          </pre>
        </section>

        {/* Step 3 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">3. Connect AutoGen to Bazaar</h2>
          <p className="mb-4">
            Use <code className="text-white/60">McpWorkbench</code> to connect to Bazaar&apos;s
            SSE endpoint. All discovered tools are automatically available to your agents:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`import os
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.ui import Console
from autogen_ext.tools.mcp import McpWorkbench, SseServerParams
from autogen_ext.models.openai import OpenAIChatCompletionClient

API_KEY = os.environ["NOUI_API_KEY"]

# Configure the Bazaar MCP connection
bazaar_params = SseServerParams(
    url="https://noui.bot/api/mcp/sse",
    headers={"Authorization": f"Bearer {API_KEY}"},
)


async def main():
    # Connect to Bazaar and discover tools
    async with McpWorkbench(bazaar_params) as workbench:
        tools = workbench.tools
        print(f"Loaded {len(tools)} Bazaar tools")

        # Create an AutoGen agent with Bazaar tools
        model_client = OpenAIChatCompletionClient(model="gpt-4o")

        agent = AssistantAgent(
            name="bazaar_agent",
            model_client=model_client,
            tools=tools,
            system_message=(
                "You are a helpful agent with access to "
                "Bazaar MCP tools. Use them to answer questions."
            ),
        )

        # Run a task
        result = await Console(
            agent.run_stream(
                task="Check the platform stats on noui.bot"
            )
        )
        print(result)


asyncio.run(main())`}
          </pre>
        </section>

        {/* Step 4 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">4. Multi-Agent Conversations</h2>
          <p className="mb-4">
            AutoGen excels at multi-agent setups. Give Bazaar tools to specific agents
            in a group chat:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.conditions import TextMentionTermination

async def multi_agent_example():
    async with McpWorkbench(bazaar_params) as workbench:
        model = OpenAIChatCompletionClient(model="gpt-4o")

        # Tool-using agent has Bazaar access
        tool_agent = AssistantAgent(
            name="tool_user",
            model_client=model,
            tools=workbench.tools,
            system_message="You fetch data using Bazaar tools.",
        )

        # Analyst agent has no tools — just reasoning
        analyst = AssistantAgent(
            name="analyst",
            model_client=model,
            system_message=(
                "You analyze data provided by tool_user. "
                "Say TERMINATE when analysis is complete."
            ),
        )

        termination = TextMentionTermination("TERMINATE")
        team = RoundRobinGroupChat(
            [tool_agent, analyst],
            termination_condition=termination,
        )

        result = await Console(
            team.run_stream(
                task="Get noui.bot stats and analyze the trends"
            )
        )
        print(result)`}
          </pre>
        </section>

        {/* Step 5 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">5. How Billing Works</h2>
          <p className="mb-4">
            Every tool call through Bazaar is metered transparently:
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <p className="text-white/60 text-xs mb-2">What happens on each tool call:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-white/50">
              <li>Your AutoGen agent calls a Bazaar tool via MCP</li>
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

        {/* Step 6 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">6. Production Tips</h2>
          <div className="space-y-4">
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Context Manager</h3>
              <p className="text-xs text-white/40">
                Always use <code className="text-white/60">async with McpWorkbench(...)</code>.
                It handles connection lifecycle, reconnection, and cleanup automatically.
              </p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Tool Isolation</h3>
              <p className="text-xs text-white/40">
                In multi-agent setups, only give Bazaar tools to agents that need them.
                Analyst and summarizer agents rarely need paid API access.
              </p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Termination Conditions</h3>
              <p className="text-xs text-white/40">
                Always set a termination condition in group chats. Without one, agents
                may loop and rack up tool call costs. Use{" "}
                <code className="text-white/60">MaxMessageTermination</code> as a safety net.
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
            <a href="/docs/guides/langchain-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-2">LangChain</h3>
              <p className="text-xs text-white/40">LangChain agents with Bazaar tools.</p>
            </a>
            <a href="/docs/guides/crewai-setup" className="border border-white/10 rounded p-4 hover:border-white/20 transition-colors">
              <h3 className="font-mono text-sm text-white/80 mb-2">CrewAI</h3>
              <p className="text-xs text-white/40">Multi-agent crews with Bazaar tools.</p>
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
