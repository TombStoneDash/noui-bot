import type { Metadata } from "next";
import { BAZAAR_PYTHON_CLIENT } from "../bazaar-python-client";

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
{`pip install autogen-agentchat "autogen-ext[openai]"`}
          </pre>
          <p className="mt-4 text-white/40">
            Bazaar runs each provider&apos;s MCP server for you behind one HTTPS proxy, so your
            agents need no MCP workbench; each Bazaar tool becomes a plain{" "}
            <code className="text-white/60">FunctionTool</code>.
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
          <h2 className="font-mono text-lg text-white/90 mb-4">3. Save the Bazaar Client</h2>
          <p className="mb-4">
            Save this as <code className="text-white/60">bazaar_client.py</code>. It lists tools from{" "}
            <code className="text-white/60">GET /api/bazaar/catalog</code> and runs them through{" "}
            <code className="text-white/60">POST /api/bazaar/proxy</code>:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{BAZAAR_PYTHON_CLIENT}
          </pre>
        </section>

        {/* Step 4 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">4. Give the Tools to an AutoGen Agent</h2>
          <p className="mb-4">
            Save this as <code className="text-white/60">agent.py</code> next to the client and run it:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`import asyncio

from autogen_agentchat.agents import AssistantAgent
from autogen_core.tools import FunctionTool
from autogen_ext.models.openai import OpenAIChatCompletionClient

from bazaar_client import (
    call_bazaar_tool,
    list_bazaar_tools,
    tool_description,
    tool_function_name,
)


def make_autogen_tool(tool: dict) -> FunctionTool:
    tool_id = tool["id"]

    def run(arguments: dict) -> str:
        return call_bazaar_tool(tool_id, arguments)

    return FunctionTool(run, description=tool_description(tool), name=tool_function_name(tool))


async def main() -> None:
    tools = [make_autogen_tool(t) for t in list_bazaar_tools()]
    print(f"Loaded {len(tools)} Bazaar tools")

    model_client = OpenAIChatCompletionClient(model="gpt-4o")
    agent = AssistantAgent(
        name="bazaar_agent",
        model_client=model_client,
        tools=tools,
        system_message="Use Bazaar tools when they help. Every call is billed to your balance.",
        reflect_on_tool_use=True,
    )

    result = await agent.run(task="What is the weather in Paris?")
    print(result.messages[-1].content)
    await model_client.close()


asyncio.run(main())`}
          </pre>
          <p className="mt-4 text-white/40">
            The catalog does not publish parameter schemas yet, so each tool takes one{" "}
            <code className="text-white/60">arguments</code> object and the model reads the expected
            fields from the tool description.
          </p>
        </section>

        {/* Multi-agent */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">Multi-Agent Conversations</h2>
          <p className="mb-4">
            Give Bazaar tools only to the agent that needs them, and always cap the conversation
            so a loop cannot keep calling paid tools:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat


async def multi_agent_example() -> None:
    tools = [make_autogen_tool(t) for t in list_bazaar_tools()]
    model_client = OpenAIChatCompletionClient(model="gpt-4o")

    tool_agent = AssistantAgent(
        name="tool_user",
        model_client=model_client,
        tools=tools,
        system_message="You fetch data using Bazaar tools.",
    )
    analyst = AssistantAgent(
        name="analyst",
        model_client=model_client,
        system_message="You analyze data provided by tool_user. Say TERMINATE when done.",
    )

    team = RoundRobinGroupChat(
        [tool_agent, analyst],
        termination_condition=TextMentionTermination("TERMINATE") | MaxMessageTermination(10),
    )
    result = await team.run(task="Get the Paris weather forecast and summarize it")
    print(result.messages[-1].content)
    await model_client.close()`}
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
              <li>Your AutoGen agent calls a Bazaar tool through the proxy</li>
              <li>Bazaar checks your balance and the tool&apos;s per-call price</li>
              <li>The tool executes and returns results</li>
              <li>Your balance is debited and a receipt is issued</li>
            </ol>
          </div>
          <pre className="mt-4 bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`# Check your balance anytime
curl https://noui.bot/api/v1/bazaar/balance \\
  -H "Authorization: Bearer bz_your_key"

# View usage and spend
curl https://noui.bot/api/v1/bazaar/usage/summary \\
  -H "Authorization: Bearer bz_your_key"`}
          </pre>
        </section>

        {/* Step 6 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">6. Production Tips</h2>
          <div className="space-y-4">
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Close the Model Client</h3>
              <p className="text-xs text-white/40">
                Call <code className="text-white/60">await model_client.close()</code> when the run
                ends. Bazaar calls are stateless HTTPS requests, so there is no tool connection to clean up.
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
