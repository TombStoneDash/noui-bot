import type { Metadata } from "next";
import { BAZAAR_PYTHON_CLIENT } from "../bazaar-python-client";

export const metadata: Metadata = {
  title: "Use Bazaar MCP Tools with CrewAI | noui.bot",
  description:
    "Connect CrewAI multi-agent crews to Agent Bazaar's metered MCP tools. Per-call billing, receipts, and transparent pricing.",
  openGraph: {
    title: "CrewAI + Agent Bazaar MCP Tools",
    description:
      "Give your CrewAI crews access to monetized MCP tools via Agent Bazaar. Install, configure, and run in under 5 minutes.",
    type: "article",
  },
};

export default function CrewAISetupPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/docs"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; docs
      </a>

      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">
        Use Bazaar MCP Tools with CrewAI
      </h1>
      <p className="text-white/40 text-sm mb-12 max-w-2xl leading-relaxed">
        Give your CrewAI multi-agent crews access to Agent Bazaar&apos;s paid tool marketplace.
        Every tool call is priced, metered, and receipted — each crew member pays only for what it uses.
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
{`pip install crewai`}
          </pre>
          <p className="mt-4 text-white/40">
            Bazaar runs each provider&apos;s MCP server for you behind one HTTPS proxy, so your
            crew needs no MCP adapter or extra packages.
          </p>
        </section>

        {/* Step 2 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">2. Set Environment Variables</h2>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`export NOUI_API_KEY="bz_your_key_here"
export OPENAI_API_KEY="sk-..."   # CrewAI default LLM`}
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
          <h2 className="font-mono text-lg text-white/90 mb-4">4. Give the Tools to a Crew</h2>
          <p className="mb-4">
            Save this as <code className="text-white/60">crew.py</code> next to the client and run it.
            Only the researcher gets paid tools; the writer just reasons:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`from crewai import Agent, Crew, Task
from crewai.tools import BaseTool

from bazaar_client import (
    call_bazaar_tool,
    list_bazaar_tools,
    tool_description,
    tool_function_name,
)


class BazaarTool(BaseTool):
    tool_id: str

    def _run(self, arguments: dict) -> str:
        return call_bazaar_tool(self.tool_id, arguments)


bazaar_tools = [
    BazaarTool(
        name=tool_function_name(t),
        description=tool_description(t),
        tool_id=t["id"],
    )
    for t in list_bazaar_tools()
]
print(f"Loaded {len(bazaar_tools)} Bazaar tools")

researcher = Agent(
    role="Research Analyst",
    goal="Gather data using the available Bazaar tools",
    backstory="You call paid tools through Agent Bazaar and report raw results.",
    tools=bazaar_tools,
    verbose=True,
)

writer = Agent(
    role="Report Writer",
    goal="Turn research into a clear summary",
    backstory="You turn raw data into actionable insights.",
    verbose=True,
)

research_task = Task(
    description="Use the available tools to get the current weather in Paris.",
    expected_output="Raw data from tool calls",
    agent=researcher,
)

report_task = Task(
    description="Write a 3-sentence summary of the findings.",
    expected_output="A concise summary report",
    agent=writer,
)

crew = Crew(agents=[researcher, writer], tasks=[research_task, report_task], verbose=True)
result = crew.kickoff()
print(result)`}
          </pre>
          <p className="mt-4 text-white/40">
            The catalog does not publish parameter schemas yet, so each tool takes one{" "}
            <code className="text-white/60">arguments</code> object and the model reads the expected
            fields from the tool description.
          </p>
        </section>

        {/* Tool scoping */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">Selective Tool Assignment</h2>
          <p className="mb-4">
            You don&apos;t have to give every agent every tool. Filter by catalog name to control
            costs and scope:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`# Only give the researcher specific tools
allowed = {"weather_forecast", "web_search"}
filtered_tools = [t for t in bazaar_tools if t.name in allowed]

researcher = Agent(
    role="Research Analyst",
    goal="Gather weather and search data",
    backstory="You have access to specific Bazaar tools.",
    tools=filtered_tools,
)`}
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
              <li>A crew member calls a Bazaar tool through the proxy</li>
              <li>Bazaar checks your balance and the tool&apos;s per-call price</li>
              <li>The tool executes and returns results to the agent</li>
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
              <h3 className="font-mono text-sm text-white/80 mb-2">Budget per Crew Run</h3>
              <p className="text-xs text-white/40">
                Check balance before and after each <code className="text-white/60">crew.kickoff()</code>.
                Multi-agent crews can make many tool calls — monitor costs during development.
              </p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Tool Scoping</h3>
              <p className="text-xs text-white/40">
                Assign only the tools each agent needs. A report writer rarely needs API tools —
                restrict expensive tools to specialized agents.
              </p>
            </div>
            <div className="border border-white/10 rounded p-4">
              <h3 className="font-mono text-sm text-white/80 mb-2">Verbose Logging</h3>
              <p className="text-xs text-white/40">
                Enable <code className="text-white/60">verbose=True</code> on agents during development
                to see which tools are called and how often. Helps catch runaway tool usage.
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
