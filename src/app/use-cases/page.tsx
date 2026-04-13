import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases — Agent Billing Scenarios | noui.bot",
  description:
    "5 real-world agent billing scenarios powered by Agent Bazaar: search agents, code assistants, data pipelines, customer support bots, and multi-agent orchestration.",
};

function Scenario({
  number,
  title,
  agent,
  tools,
  pricing,
  monthly,
  description,
}: {
  number: string;
  title: string;
  agent: string;
  tools: string[];
  pricing: string;
  monthly: string;
  description: string;
}) {
  return (
    <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center font-mono text-emerald-400 text-sm">
          {number}
        </span>
        <h3 className="font-mono text-sm font-medium text-white">{title}</h3>
      </div>

      <p className="text-sm text-white/50 leading-relaxed mb-6">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
            Agent
          </div>
          <div className="font-mono text-xs text-white/70">{agent}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
            Pricing Model
          </div>
          <div className="font-mono text-xs text-white/70">{pricing}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="font-mono text-[10px] text-white/30 uppercase mb-2">
          Tools Used
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-white/50"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-4">
        <div className="font-mono text-[10px] text-white/30 uppercase mb-1">
          Estimated Monthly Cost
        </div>
        <div className="font-mono text-lg font-bold text-emerald-400">
          {monthly}
        </div>
      </div>
    </div>
  );
}

function CodeExample({ code }: { code: string }) {
  return (
    <pre className="bg-black/50 border border-white/[0.06] rounded p-4 text-xs text-white/60 font-mono overflow-x-auto whitespace-pre-wrap">
      {code}
    </pre>
  );
}

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
        Use Cases
      </h1>
      <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed mb-16">
        Real-world agent billing scenarios. Each one runs through Agent Bazaar&apos;s
        metered proxy &mdash; authenticated, billed, and auditable.
      </p>

      <div className="space-y-8">
        <Scenario
          number="1"
          title="Research Agent with Web Search"
          agent="A Claude-based research assistant that answers questions by searching the web, extracting content, and synthesizing answers."
          tools={["web_search", "url_extract", "summarize"]}
          pricing="$0.01/call (web_search), $0.005/call (extract), Free (summarize)"
          monthly="~$15 at 1,000 queries/day"
          description="The agent receives a question, searches the web for relevant sources, extracts content from the top results, and synthesizes a cited answer. Each search and extraction is a separate metered call through Bazaar."
        />

        <Scenario
          number="2"
          title="Code Review Bot in CI/CD"
          agent="A GitHub Actions bot that reviews every PR using static analysis tools, linting, and security scanning via MCP."
          tools={["code_lint", "security_scan", "complexity_check", "style_format"]}
          pricing="$0.02/call (security_scan), $0.005/call (others)"
          monthly="~$8 for a team with 50 PRs/week"
          description="On every pull request, the bot calls 4 tools sequentially: lint the diff, run a security scan, check complexity metrics, and verify formatting. The security scan costs more because it checks against CVE databases in real-time."
        />

        <div className="border border-white/[0.06] rounded-lg p-6">
          <div className="font-mono text-xs text-white/30 uppercase tracking-wider mb-4">
            Integration Example
          </div>
          <CodeExample
            code={`// CI/CD bot calling tools through Bazaar
const bz = new Bazaar({ apiKey: process.env.BAZAAR_KEY });

const [lint, security] = await Promise.all([
  bz.tools.call("code_lint", { diff: prDiff }),
  bz.tools.call("security_scan", { diff: prDiff }),
]);

// Total cost for this PR: ~$0.03
// Bazaar handles auth, metering, billing automatically
await postGitHubComment(pr, formatReview(lint, security));`}
          />
        </div>

        <Scenario
          number="3"
          title="Data Pipeline with ETL Tools"
          agent="A scheduled agent that extracts data from APIs, transforms it, and loads it into a warehouse — all through metered MCP tools."
          tools={["api_extract", "data_transform", "warehouse_load", "schema_validate"]}
          pricing="$0.001/call (transform), $0.01/call (extract), $0.005/call (load)"
          monthly="~$45 at 100K records/day"
          description="Every hour, the agent extracts new records from external APIs, validates schemas, transforms the data, and loads it into the warehouse. High-volume but low cost per call — sub-cent metering makes this viable."
        />

        <Scenario
          number="4"
          title="Customer Support Agent"
          agent="A support bot that handles tickets by searching knowledge bases, looking up order status, and escalating to humans when needed."
          tools={["kb_search", "order_lookup", "sentiment_analysis", "human_escalate"]}
          pricing="$0.005/call (kb_search), $0.02/call (order_lookup), $0.50/call (human_escalate)"
          monthly="~$120 at 500 tickets/day"
          description="Most tickets are resolved with a knowledge base search ($0.005). Complex orders need a lookup ($0.02). The 5% that need a human cost more ($0.50) but save hours of support team time. Bazaar tracks which tools resolved which tickets."
        />

        <Scenario
          number="5"
          title="Multi-Agent Orchestrator"
          agent="A coordinator agent that dispatches tasks to specialized sub-agents, each using different tool providers — all billed through a single Bazaar consumer key."
          tools={["web_search", "code_gen", "image_gen", "translate", "pdf_parse", "email_send"]}
          pricing="Mixed: $0.001–$0.10/call across 4 providers"
          monthly="~$200 at 2,000 orchestrated tasks/day"
          description="The orchestrator decides which tools each task needs, calls them in parallel through Bazaar, and aggregates results. One API key, one balance, one usage dashboard — even though tools come from 4 different providers with different pricing."
        />

        <div className="border border-white/[0.06] rounded-lg p-6">
          <div className="font-mono text-xs text-white/30 uppercase tracking-wider mb-4">
            Multi-Agent Example
          </div>
          <CodeExample
            code={`// One consumer key, multiple providers
const bz = new Bazaar({ apiKey: "bz_orchestrator_key" });

// These hit 3 different providers — Bazaar routes automatically
const [search, code, image] = await Promise.all([
  bz.tools.call("web_search", { query }),      // Provider A: $0.01
  bz.tools.call("code_gen", { prompt }),        // Provider B: $0.05
  bz.tools.call("image_gen", { description }), // Provider C: $0.10
]);

// Check spend: single dashboard for all providers
const usage = await bz.usage.summary();
console.log(usage.total_cost); // "$0.16 for this task"`}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 pt-8 border-t border-white/10">
        <div className="flex items-center gap-4 flex-wrap">
          <a
            href="/get-started"
            className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors"
          >
            Start Building
          </a>
          <a
            href="/pricing"
            className="font-mono text-sm border border-white/20 text-white/60 px-6 py-3 rounded hover:border-white/40 hover:text-white transition-colors"
          >
            View Pricing
          </a>
          <a
            href="/providers"
            className="font-mono text-sm text-white/30 hover:text-white/50 transition-colors"
          >
            Browse Providers
          </a>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </div>
  );
}
