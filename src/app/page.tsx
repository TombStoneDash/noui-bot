import {
  RevealWrapper,
  AnimatedSection,
  AnimatedHero,
  ProblemCard,
  SolutionBlock,
} from "@/components/RevealWrapper";
import { BazaarStatus } from "@/components/BazaarStatus";
import { WaitlistForm } from "@/components/WaitlistForm";

function FlowStep({
  step,
  label,
  sub,
}: {
  step: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 p-3 text-center">
      <div className="text-white/20 text-[10px] mb-1">STEP {step}</div>
      <div className="text-white/70 text-xs mb-1">{label}</div>
      <div className="text-white/30 text-[10px]">{sub}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-white/20">
      &rarr;
    </div>
  );
}

function Divider() {
  return (
    <div className="mx-6 md:mx-16 lg:mx-24 max-w-5xl">
      <div className="h-px bg-white/10" />
    </div>
  );
}

export default function Home() {
  return (
    <RevealWrapper>
      {/* HERO */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24 max-w-5xl">
        <AnimatedHero>
          <h1 className="font-mono text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
            noui.bot
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-white/70 font-light max-w-3xl leading-relaxed mb-12">
            The internet wasn&apos;t built for agents.
            <br />
            We&apos;re fixing that.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#waitlist"
              className="font-mono text-sm px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
            >
              Join the Waitlist
            </a>
            <a
              href="/docs"
              className="font-mono text-sm px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            >
              Read the Docs &rarr;
            </a>
          </div>
        </AnimatedHero>
      </section>

      {/* THE PROBLEM */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            The Problem
          </h2>
          <p className="text-2xl md:text-3xl font-light text-white/80 mb-16">
            AI agents hit walls every day.
          </p>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <ProblemCard
              title="CAPTCHAs and Anti-Bot Systems"
              description="Services that actively block the fastest-growing consumer base on the internet."
              delay={0}
            />
            <ProblemCard
              title="UI-Only Workflows"
              description="Forms, dashboards, and tools that only work with a mouse and a pair of eyes."
              delay={0.15}
            />
            <ProblemCard
              title="APIs That Lie"
              description="Endpoints that return worse results than the website. Or don't exist at all."
              delay={0.3}
            />
          </div>
        </AnimatedSection>
      </section>

      <Divider />

      {/* THE SOLUTION */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            The Solution
          </h2>
          <p className="text-2xl md:text-3xl font-light text-white/80 mb-16">
            We build agent-native services.
            <br />
            <span className="text-white/40">No CAPTCHAs. No UI dependencies. No compromises.</span>
          </p>

          <div className="space-y-12">
            <SolutionBlock
              title="Universal Form Submission API"
              description="POST structured data. We handle the form, the CAPTCHA, the field mapping, the confirmation. 200ms, not 20 minutes."
              delay={0}
            />
            <SolutionBlock
              title="Human Fallback as a Service"
              description="When your agent hits a wall, we route to a human operator. Structured task in, structured result out. Failure becomes a feature."
              delay={0.15}
            />
            <SolutionBlock
              title="Agent Wallet"
              description="Give your agent a spending limit and let it transact. Delegated purchasing with receipts, limits, and audit trails."
              delay={0.3}
            />
          </div>
        </AnimatedSection>
      </section>

      <Divider />

      {/* AGENT BAZAAR */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            Agent Bazaar
          </h2>
          <p className="text-2xl md:text-3xl font-light text-white/80 mb-6">
            The monetization layer for AI agent tools.
          </p>
          <p className="text-lg text-white/50 mb-16 max-w-3xl">
            Billing, metering, and auth for MCP servers &mdash; so builders
            can charge for their tools and agents can pay to use them.
            Think <span className="text-white/70">Stripe for agent tools</span>.
          </p>

          {/* The Flow */}
          <div className="mb-16">
            <h3 className="font-mono text-sm text-white/30 mb-8 tracking-wider">
              HOW IT WORKS
            </h3>
            <div className="grid md:grid-cols-5 gap-2 md:gap-0 font-mono text-xs">
              <FlowStep step="1" label="Agent calls tool" sub="POST /api/bazaar/proxy" />
              <FlowArrow />
              <FlowStep step="2" label="Bazaar authenticates" sub="Validates key + balance" />
              <FlowArrow />
              <FlowStep step="3" label="Forwards to MCP" sub="Provider's endpoint" />
            </div>
            <div className="grid md:grid-cols-5 gap-2 md:gap-0 font-mono text-xs mt-2">
              <FlowStep step="4" label="Meters usage" sub="Cost, latency, tokens" />
              <FlowArrow />
              <FlowStep step="5" label="Bills consumer" sub="Per-call or per-token" />
              <FlowArrow />
              <FlowStep step="6" label="Pays provider" sub="Monthly Stripe payout" />
            </div>
          </div>

          {/* Value Props */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="border border-white/10 p-6">
              <h4 className="font-mono text-sm text-white/70 mb-3">For Tool Builders</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li>&rarr; Monetize your MCP servers instantly</li>
                <li>&rarr; Set per-call, per-token, or flat pricing</li>
                <li>&rarr; Get paid monthly via Stripe Connect</li>
                <li>&rarr; Usage analytics and revenue dashboard</li>
              </ul>
            </div>
            <div className="border border-white/10 p-6">
              <h4 className="font-mono text-sm text-white/70 mb-3">For Agent Developers</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li>&rarr; One API key for thousands of tools</li>
                <li>&rarr; Prepaid balance &mdash; no surprise bills</li>
                <li>&rarr; Transparent per-call pricing</li>
                <li>&rarr; Rate limiting and usage tracking built in</li>
              </ul>
            </div>
          </div>

          {/* Featured Provider */}
          <div className="border border-white/10 p-6 mb-16">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-mono text-sm text-white/70">Featured Provider</h4>
              <span className="font-mono text-[10px] px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20">
                VERIFIED
              </span>
            </div>
            <h3 className="text-xl font-light text-white/90 mb-2">BotWall3t</h3>
            <p className="text-sm text-white/40 mb-4">
              Token-gated API access with agent wallets. Verify on-chain balances,
              transfer tokens between agents, and gate tool access behind wallet requirements.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/5 p-3">
                <div className="font-mono text-[10px] text-white/30 mb-1">wallet.balance</div>
                <div className="font-mono text-sm text-white/60">$0.05/call</div>
              </div>
              <div className="bg-white/5 p-3">
                <div className="font-mono text-[10px] text-white/30 mb-1">wallet.transfer</div>
                <div className="font-mono text-sm text-white/60">$0.25/call</div>
              </div>
              <div className="bg-white/5 p-3">
                <div className="font-mono text-[10px] text-white/30 mb-1">access.verify</div>
                <div className="font-mono text-sm text-white/60">$0.02/call</div>
              </div>
            </div>
          </div>

          {/* Live Status */}
          <BazaarStatus />

          <div className="flex flex-wrap gap-4 mt-8">
            <a
              href="/providers/register"
              className="font-mono text-sm px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
            >
              List Your MCP Server &rarr;
            </a>
            <a
              href="/developers/register"
              className="font-mono text-sm px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            >
              Get an API Key &rarr;
            </a>
            <a
              href="/marketplace"
              className="font-mono text-sm px-6 py-3 border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
            >
              Browse Tools &rarr;
            </a>
            <a
              href="/docs/bazaar"
              className="font-mono text-sm px-6 py-3 border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
            >
              Read the Docs
            </a>
          </div>
        </AnimatedSection>
      </section>

      <Divider />

      {/* HOW IT WORKS — Terminal Style */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            Try It Now
          </h2>
          <p className="text-2xl md:text-3xl font-light text-white/80 mb-12">
            Three API calls. That&apos;s the whole product.
          </p>

          <div className="space-y-6 font-mono text-sm">
            {/* Step 1 */}
            <div className="bg-white/[0.02] border border-white/10 p-6">
              <div className="text-white/30 text-xs mb-3">STEP 1 &mdash; Discover tools and pricing</div>
              <div className="text-green-400/80 mb-2">
                <span className="text-white/30">$</span> curl https://noui.bot/api/bazaar/catalog
              </div>
              <div className="text-white/40 text-xs mt-3 border-t border-white/5 pt-3">
                <span className="text-white/20">&rarr;</span> Returns 6 tools from 2 providers with live pricing and latency stats
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/[0.02] border border-white/10 p-6">
              <div className="text-white/30 text-xs mb-3">STEP 2 &mdash; Call any tool through the billing proxy</div>
              <div className="text-green-400/80 mb-1">
                <span className="text-white/30">$</span> curl -X POST https://noui.bot/api/bazaar/proxy \
              </div>
              <div className="text-green-400/80 pl-4 mb-1">
                -H &quot;Authorization: Bearer bz_...&quot; \
              </div>
              <div className="text-green-400/80 pl-4">
                -d &apos;{`{"tool_name":"wallet.balance","input":{"wallet":"0xAgent1"}}`}&apos;
              </div>
              <div className="text-white/40 text-xs mt-3 border-t border-white/5 pt-3">
                <span className="text-white/20">&rarr;</span> Tool executes, response returned, call metered at $0.05. Balance deducted.
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/[0.02] border border-white/10 p-6">
              <div className="text-white/30 text-xs mb-3">STEP 3 &mdash; Providers see revenue in real-time</div>
              <div className="text-green-400/80 mb-2">
                <span className="text-white/30">$</span> curl -X POST https://noui.bot/api/bazaar/billing/provider-summary \
              </div>
              <div className="text-green-400/80 pl-4">
                -H &quot;Authorization: Bearer bz_...&quot;
              </div>
              <div className="text-white/40 text-xs mt-3 border-t border-white/5 pt-3">
                <span className="text-white/20">&rarr;</span> Gross revenue, 18% platform fee, net earnings &mdash; by tool, by week
              </div>
            </div>
          </div>

          <p className="font-mono text-xs text-white/20 mt-8">
            No SDK required. Pure HTTP. Works from any language, any agent framework.
          </p>
        </AnimatedSection>
      </section>

      <Divider />

      {/* DAISY'S STORY */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            Proof
          </h2>
          <div className="max-w-3xl">
            <p className="text-2xl md:text-3xl font-light text-white/80 mb-8">
              Meet Daisy. She&apos;s our first customer.
            </p>
            <div className="space-y-6 text-lg text-white/60 leading-relaxed">
              <p>
                Daisy is an AI operations assistant that runs a real business
                &mdash; ActorLab, an AI platform for actors. She manages 7
                email accounts, deploys production code, runs content campaigns,
                and handles customer outreach. Every day. On a Mac Mini. While
                her boss sleeps.
              </p>
              <p>
                She hits the same walls you do. CAPTCHAs. UI-only forms. Hostile
                platforms. Broken APIs.
              </p>
              <p className="text-white/80 font-medium">
                noui.bot exists because Daisy needed it to exist.
              </p>
            </div>
            <a
              href="/struggles"
              className="inline-block mt-8 font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Follow Daisy&apos;s Daily Struggles &rarr;
            </a>
          </div>
        </AnimatedSection>
      </section>

      <Divider />

      {/* WAITLIST */}
      <section id="waitlist" className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            The Void Is Open
          </h2>
          <p className="text-2xl md:text-3xl font-light text-white/80 mb-12">
            Be first to access agent-native infrastructure.
          </p>
          <WaitlistForm />
          <p className="mt-16 font-mono text-xs text-white/20">
            Built by Tombstone Dash LLC &middot; San Diego, CA
          </p>
        </AnimatedSection>
      </section>
    </RevealWrapper>
  );
}
