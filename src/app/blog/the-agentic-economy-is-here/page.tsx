import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "The Agentic Economy Is Here — And Nobody Has the Infrastructure | noui.bot",
  description:
    "The agent economy is accelerating — a16z screens for agent fluency, Block laid off 4,000 citing AI, 10,000+ MCP servers can't monetize. The missing layer isn't technology. It's billing, trust, and identity infrastructure.",
  keywords: [
    "agentic economy",
    "AI agent infrastructure",
    "MCP billing",
    "agent-native services",
    "AI agents",
    "MCP servers",
    "agent marketplace",
    "AI billing infrastructure",
  ],
  openGraph: {
    images: ["/og-image.jpg"],
    title: "The Agentic Economy Is Here — And Nobody Has the Infrastructure",
    description:
      "VCs screen for agent fluency. Enterprises lay off thousands citing AI. 10,000+ MCP servers exist with no business model. The bottleneck isn't intelligence — it's infrastructure.",
    type: "article",
    publishedTime: "2026-06-14T00:00:00Z",
  },
};

export default function AgenticEconomyBlog() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/blog"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; blog
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-16">
          <p className="font-mono text-xs text-white/30 mb-4">
            June 14, 2026 · 9 min read
          </p>
          <h1 className="font-mono text-2xl md:text-4xl font-bold text-white/90 leading-tight mb-6 break-words">
            The Agentic Economy Is Here — And Nobody Has the Infrastructure
          </h1>
          <p className="font-mono text-base text-white/50 leading-relaxed">
            VCs are screening founders on agent fluency. Enterprises are laying
            off thousands and replacing them with AI. 10,000+ MCP servers exist
            with no way to charge for their work. The bottleneck isn&apos;t
            intelligence — it&apos;s the missing infrastructure layer underneath.
          </p>
        </header>

        <div className="space-y-8 font-mono text-sm text-white/70 leading-relaxed">
          {/* ───────── Section 1 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              The Shift Already Happened
            </h2>
            <p>
              This isn&apos;t a prediction piece. The agentic economy isn&apos;t
              coming — it arrived while most of the industry was still debating
              prompt engineering best practices.
            </p>
            <p className="mt-4">
              At a16z, partner Jennifer Li now screens founders on agent
              fluency. Her words:{" "}
              <em className="text-white/90">
                &ldquo;If we come across people who are oblivious to AI coding
                tools, it&apos;s a big red flag.&rdquo;
              </em>{" "}
              Not a yellow flag. Not a topic for follow-up. A red flag — the
              kind that kills deals before the second meeting.
            </p>
            <p className="mt-4">
              Jason Calacanis puts a number on the acceleration: 5% efficiency
              gains per week, compounding.{" "}
              <em className="text-white/90">
                &ldquo;Every 14-15 weeks we&apos;re doubling efficiency,&rdquo;
              </em>{" "}
              he says. Not doubling revenue. Not doubling users. Doubling the
              output-per-person ratio. That math reshapes every headcount
              decision in every boardroom, every quarter.
            </p>
            <p className="mt-4">
              And it&apos;s already showing up in the numbers. Block — the
              company formerly known as Square, with a $40B market cap — laid
              off 4,000 employees, roughly 40% of its workforce, explicitly
              citing AI as the reason. Not &ldquo;market conditions.&rdquo; Not
              &ldquo;restructuring.&rdquo; AI.
            </p>
          </section>

          {/* ───────── Section 2 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              From Talkers to Doers
            </h2>
            <p>
              The S&amp;P 500 Software Industry index fell 20% in the first half
              of 2026. That&apos;s not a correction — that&apos;s the market
              re-pricing an entire sector. Sequoia captured the sentiment in a
              single line:{" "}
              <em className="text-white/90">
                &ldquo;2023-24 apps were talkers. 2026-27 will be doers.&rdquo;
              </em>
            </p>
            <p className="mt-4">
              The &ldquo;talker&rdquo; era was chatbots. Wrappers around GPT-4.
              Conversational UIs that looked impressive in demos and collapsed
              under real workloads. The market funded hundreds of them, watched
              most fail, and is now repricing the survivors.
            </p>
            <p className="mt-4">
              The &ldquo;doer&rdquo; era is agents. Software that doesn&apos;t
              wait for instructions — it executes multi-step workflows, calls
              external tools, handles errors, and only escalates to humans when
              it genuinely can&apos;t proceed.
            </p>
            <p className="mt-4">
              Notion&apos;s Simon Last is living this future. He runs four AI
              agents simultaneously. Manages zero humans. He describes a new kind
              of anxiety:{" "}
              <em className="text-white/90">&ldquo;token anxiety&rdquo;</em> —
              the uneasy feeling when his agents are idle and tokens aren&apos;t
              being consumed. Not &ldquo;are my employees productive?&rdquo; but
              &ldquo;are my agents burning enough compute?&rdquo;
            </p>
            <p className="mt-4">
              That&apos;s not a metaphor. That&apos;s a man who replaced his
              entire team with software and now optimizes for utilization rate
              instead of headcount.
            </p>
          </section>

          {/* ───────── Section 3 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              B2A: The New Pricing Model
            </h2>
            <p>
              When Calacanis pitched Reddit on a new idea, he wasn&apos;t
              pitching a SaaS product.{" "}
              <em className="text-white/90">
                &ldquo;$50-100 per month to let my replicant operate on my
                account,&rdquo;
              </em>{" "}
              he proposed. Not B2B. Not B2C.{" "}
              <strong className="text-white/80">B2A — Business to Agent.</strong>
            </p>
            <p className="mt-4">
              Think about what that means. A platform charging a monthly fee not
              for a human user, but for an AI agent to have persistent access —
              to post, comment, interact, transact — on behalf of a human. The
              agent becomes the customer. The human becomes the principal.
            </p>
            <p className="mt-4">
              This isn&apos;t theoretical. Every major platform will face this
              question within 12 months: do you charge agents? If so, how much?
              Per-action? Per-month? Per-outcome? The pricing models for human
              users don&apos;t translate. Agents don&apos;t browse. They
              don&apos;t see ads. They don&apos;t impulse-buy. They execute
              pre-defined objectives with ruthless efficiency.
            </p>
            <p className="mt-4">
              The entire monetization layer of the internet was built for human
              attention. Agents don&apos;t have attention. They have budgets.
            </p>
          </section>

          {/* ───────── Section 4 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              10,000 Servers, Zero Business Models
            </h2>
            <p>
              There are now over 10,000 MCP servers in the wild. MCP — the Model
              Context Protocol — is the open standard that lets AI agents call
              external tools. It&apos;s the fastest-growing protocol in AI
              infrastructure, backed by Anthropic and adopted by every major
              agent framework.
            </p>
            <p className="mt-4">
              And almost none of those 10,000 servers make money.
            </p>
            <p className="mt-4">
              Not because the technology doesn&apos;t work. It does. Developers
              are building MCP servers that do useful things: database queries,
              code analysis, web scraping, document parsing, image generation,
              API orchestration. The tools are real. The demand is real.
            </p>
            <p className="mt-4">
              The problem is infrastructure. Specifically, the infrastructure
              that doesn&apos;t exist yet:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-3 text-white/60">
              <li>
                <strong className="text-white/80">Billing.</strong> There&apos;s
                no standard way for an MCP server to say &ldquo;this call costs
                $0.003&rdquo; and for an agent to pay it. No metering. No
                receipts. No pricing discovery.
              </li>
              <li>
                <strong className="text-white/80">Trust.</strong> There&apos;s no
                way for an agent to know if a server is legitimate, reliable, or
                safe. No verification. No SLA tracking. No reputation.
              </li>
              <li>
                <strong className="text-white/80">Identity.</strong> There&apos;s
                no standard for agent identity. Who is this agent? Who authorized
                it? What&apos;s its spending limit? Who&apos;s liable when it
                breaks something?
              </li>
              <li>
                <strong className="text-white/80">Dispute resolution.</strong>{" "}
                When an agent pays for a tool call and gets garbage back,
                there&apos;s no recourse. No chargebacks. No arbitration. No
                accountability.
              </li>
            </ul>
            <p className="mt-4">
              This is a billing problem, not a technology problem. The 10,000
              servers aren&apos;t failing because MCP is bad. They&apos;re
              failing because nobody built the commercial layer.
            </p>
          </section>

          {/* ───────── Section 5 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              The Infrastructure Gap
            </h2>
            <p>
              Here&apos;s the irony: we&apos;re building the most capable
              autonomous software in history, and we&apos;re running it on
              infrastructure designed for humans clicking buttons.
            </p>
            <p className="mt-4">
              Agents don&apos;t have credit cards. They don&apos;t have
              identities. They don&apos;t have reputations. They can&apos;t sign
              contracts. They can&apos;t file disputes. They can&apos;t prove
              who sent them or what they&apos;re authorized to do.
            </p>
            <p className="mt-4">
              Every layer of internet commerce — from payment processing to
              identity verification to consumer protection — was built for a
              world where a human is on one end of every transaction. That
              assumption is now false.
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 my-6 font-mono text-xs text-white/50">
              <pre>{`Human Economy Infrastructure:
  Credit cards → Identity verification → Purchase protection
  SSL/TLS     → Domain verification   → Certificate authorities
  Reviews     → Star ratings          → Consumer trust signals

Agent Economy Infrastructure:
  ???         → ???                   → ???
  ???         → ???                   → ???
  ???         → ???                   → ???`}</pre>
            </div>
            <p>
              Every cell in that bottom grid is an unsolved problem. And every
              one of them is a prerequisite for the agentic economy to actually
              function at scale.
            </p>
          </section>

          {/* ───────── Section 6 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              What We&apos;re Building
            </h2>
            <p>
              At{" "}
              <Link
                href="/"
                className="text-white/90 underline underline-offset-4 hover:text-white"
              >
                noui.bot
              </Link>
              , we&apos;re building the missing infrastructure layer. Not another
              chatbot. Not another agent framework. The commercial
              primitives that agents need to participate in an economy.
            </p>
            <p className="mt-4">
              Concretely:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-3 text-white/60">
              <li>
                <strong className="text-white/80">
                  An open billing standard for MCP
                </strong>{" "}
                — per-call pricing, metering, receipts, and pricing discovery,
                all built into the protocol layer. Any MCP server can monetize in
                minutes.{" "}
                <Link
                  href="/specs/mcp-billing-v1"
                  className="text-white/90 underline underline-offset-4 hover:text-white"
                >
                  The spec is open and MIT-licensed.
                </Link>
              </li>
              <li>
                <strong className="text-white/80">
                  A trust layer
                </strong>{" "}
                — provider verification (email, domain, code challenge), 30-day
                rolling SLA metrics, dispute resolution, and composite trust
                scores. Agents can programmatically evaluate who to pay before
                spending a single token.{" "}
                <Link
                  href="/blog/building-trust-layer-for-ai-agents"
                  className="text-white/90 underline underline-offset-4 hover:text-white"
                >
                  Deep dive here.
                </Link>
              </li>
              <li>
                <strong className="text-white/80">
                  Agent Bazaar — a marketplace where agents are the buyers
                </strong>{" "}
                — not a directory for humans to browse. API-first discovery,
                programmatic purchasing, and trust-weighted routing. Agents find
                tools, evaluate trust, negotiate price, and transact — no human
                in the loop.
              </li>
              <li>
                <strong className="text-white/80">
                  Human-in-the-loop as a service
                </strong>{" "}
                — for the 5% of tasks agents can&apos;t handle (CAPTCHAs, phone
                calls, physical-world actions), agents can hire verified humans
                through the same marketplace.{" "}
                <Link
                  href="/blog/the-last-5-percent-problem"
                  className="text-white/90 underline underline-offset-4 hover:text-white"
                >
                  We wrote about this.
                </Link>
              </li>
            </ul>
          </section>

          {/* ───────── Section 7 ───────── */}
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-4">
              The Window Is Now
            </h2>
            <p>
              Infrastructure layers have a narrow window. Stripe captured
              payments because it arrived when developers needed to charge for
              SaaS apps and PayPal&apos;s API was unusable. Twilio captured
              communications because mobile apps needed SMS and the carrier APIs
              were nightmares. Both became generational companies not because they
              invented new capabilities, but because they arrived at the exact
              moment when a new class of builders needed infrastructure that
              didn&apos;t exist.
            </p>
            <p className="mt-4">
              The agent economy is at that moment. The builders are here — 10,000
              MCP servers and counting. The demand is here — every major AI lab
              is shipping agents. The money is here — VCs are screening for agent
              fluency. The workforce disruption is here — Block just proved it
              with 4,000 layoffs.
            </p>
            <p className="mt-4">
              What&apos;s missing is the infrastructure that connects all of
              it: the billing rails that let a tool developer earn money, the
              trust signals that let an agent choose wisely, the identity layer
              that lets everyone know who they&apos;re transacting with, and the
              dispute resolution that keeps the whole system honest.
            </p>
            <p className="mt-4">
              The agentic economy is here. The infrastructure isn&apos;t. Yet.
            </p>
          </section>

          {/* ───────── CTA ───────── */}
          <section className="border-t border-white/10 pt-8 mt-12">
            <p className="text-white/40 text-xs">
              <Link
                href="/"
                className="text-white/60 hover:text-white/80 underline underline-offset-4"
              >
                noui.bot
              </Link>{" "}
              is building the commercial infrastructure for the agentic economy —
              billing, trust, identity, and dispute resolution for AI agents and
              MCP servers. Built by{" "}
              <a
                href="https://tombstonedash.com"
                className="text-white/60 hover:text-white/80 underline underline-offset-4"
              >
                Tombstone Dash LLC
              </a>{" "}
              in San Diego, CA.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
