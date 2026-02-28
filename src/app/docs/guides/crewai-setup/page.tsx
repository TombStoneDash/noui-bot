import type { Metadata } from "next";

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
{`pip install crewai crewai-tools mcp`}
          </pre>
          <p className="mt-4 text-white/40">
            CrewAI includes built-in MCP support via{" "}
            <code className="text-white/60">MCPServerAdapter</code>.
            The <code className="text-white/60">mcp</code> package handles the protocol layer.
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
          <h2 className="font-mono text-lg text-white/90 mb-4">3. Connect CrewAI to Bazaar</h2>
          <p className="mb-4">
            Use CrewAI&apos;s <code className="text-white/60">MCPServerAdapter</code> to connect
            to Bazaar&apos;s SSE endpoint. All discovered tools become available to your agents:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`import os
from crewai import Agent, Task, Crew
from crewai_tools.mcp import MCPServerAdapter

API_KEY = os.environ["NOUI_API_KEY"]

# Connect to Bazaar's MCP proxy via SSE
bazaar_server = MCPServerAdapter(
    server_url="https://noui.bot/api/mcp/sse",
    headers={"Authorization": f"Bearer {API_KEY}"},
)

# Get all Bazaar tools as CrewAI tools
bazaar_tools = bazaar_server.tools


# --- Define your crew ---

researcher = Agent(
    role="Research Analyst",
    goal="Gather data using available Bazaar tools",
    backstory="You are a meticulous researcher with access to "
              "paid API tools via Agent Bazaar.",
    tools=bazaar_tools,
    verbose=True,
)

analyst = Agent(
    role="Report Writer",
    goal="Synthesize research into a clear summary",
    backstory="You turn raw data into actionable insights.",
    verbose=True,
)

research_task = Task(
    description="Use the available tools to check noui.bot "
                "platform stats and list available services.",
    expected_output="Raw data from tool calls",
    agent=researcher,
)

report_task = Task(
    description="Write a 3-sentence summary of the findings.",
    expected_output="A concise summary report",
    agent=analyst,
)

crew = Crew(
    agents=[researcher, analyst],
    tasks=[research_task, report_task],
    verbose=True,
)

result = crew.kickoff()
print(result)`}
          </pre>
        </section>

        {/* Step 4 */}
        <section>
          <h2 className="font-mono text-lg text-white/90 mb-4">4. Selective Tool Assignment</h2>
          <p className="mb-4">
            You don&apos;t have to give every agent every tool. Filter by name to control
            costs and scope:
          </p>
          <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-green-400 text-xs">
{`# Only give the researcher specific tools
allowed = ["platform_stats", "list_services"]
filtered_tools = [t for t in bazaar_tools if t.name in allowed]

researcher = Agent(
    role="Research Analyst",
    goal="Gather platform data",
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
              <li>A crew member calls a Bazaar tool via MCP</li>
              <li>Bazaar checks your balance and the tool&apos;s per-call price</li>
              <li>The tool executes and returns results to the agent</li>
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
