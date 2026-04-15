import {
  RevealWrapper,
  AnimatedSection,
  AnimatedHero,
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
          <h1 className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Ship billing for your MCP tools in 5 minutes
          </h1>
          <p className="text-xl md:text-2xl text-white/60 font-light max-w-3xl leading-relaxed mb-8">
            Agent Bazaar handles discovery, metering, and payments so you can focus on building.
          </p>

          {/* SDK Install */}
          <div className="bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm inline-flex items-center gap-3 mb-8">
            <span className="text-white/30">$</span>
            <span className="text-green-400/80">npm install @forthebots/bazaar-sdk</span>
          </div>

          <div className="flex flex-wrap gap-4 mb-12">
            <a
              href="/get-started"
              className="font-mono text-sm px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
            >
              Get Started &rarr;
            </a>
            <a
              href="/providers"
              className="font-mono text-sm px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            >
              Browse Providers
            </a>
            <a
              href="/docs/bazaar"
              className="font-mono text-sm px-6 py-3 border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
            >
              Read the Docs
            </a>
          </div>

          {/* Live Social Proof */}
          <BazaarStatus />
        </AnimatedHero>
      </section>

      {/* THREE AUDIENCE CARDS */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-white/10 p-6">
              <h3 className="font-mono text-sm text-white/70 mb-3">For Providers</h3>
              <p className="text-white/40 text-sm mb-4 leading-relaxed">
                Monetize your MCP tools. Set per-call pricing, connect Stripe, and start earning. Keep 90% of every paid call.
              </p>
              <ul className="space-y-2 text-xs text-white/30 mb-6">
                <li>&rarr; Register in 5 minutes, no code changes</li>
                <li>&rarr; Exactly-once billing, signed receipts</li>
                <li>&rarr; Listed in the provider marketplace</li>
              </ul>
              <a href="/providers/register" className="font-mono text-xs text-green-400 hover:text-green-300 transition-colors">
                List your tools &rarr;
              </a>
            </div>

            <div className="border border-white/10 p-6">
              <h3 className="font-mono text-sm text-white/70 mb-3">For Consumers</h3>
              <p className="text-white/40 text-sm mb-4 leading-relaxed">
                Discover and pay for MCP tools with one API key. Usage tracking, prepaid balance, and dispute resolution built in.
              </p>
              <ul className="space-y-2 text-xs text-white/30 mb-6">
                <li>&rarr; One key for all providers</li>
                <li>&rarr; Free tier: 100 calls/month</li>
                <li>&rarr; Real-time usage dashboard</li>
              </ul>
              <a href="/get-started" className="font-mono text-xs text-green-400 hover:text-green-300 transition-colors">
                Get started free &rarr;
              </a>
            </div>

            <div className="border border-white/10 p-6">
              <h3 className="font-mono text-sm text-white/70 mb-3">For Platforms</h3>
              <p className="text-white/40 text-sm mb-4 leading-relaxed">
                Embed our billing API in your agent platform. Open billing spec (MIT), no vendor lock-in, pure HTTP.
              </p>
              <ul className="space-y-2 text-xs text-white/30 mb-6">
                <li>&rarr; Open MCP billing spec</li>
                <li>&rarr; REST API + TypeScript SDK</li>
                <li>&rarr; White-label ready</li>
              </ul>
              <a href="/specs/mcp-billing-v1" className="font-mono text-xs text-green-400 hover:text-green-300 transition-colors">
                Read the spec &rarr;
              </a>
            </div>
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
            The trust layer for paid MCP tools.
          </p>
          <p className="text-lg text-white/50 mb-16 max-w-3xl">
            Exactly-once billing, dispute resolution, and delivery guarantees &mdash; so providers get paid and consumers get what they paid for.
            <span className="text-white/70"> 10% platform fee. No hidden costs. No surprise charges.</span>
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
                <li>&rarr; Exactly-once billing &mdash; no duplicate charges</li>
                <li>&rarr; Built-in dispute resolution</li>
                <li>&rarr; Provider SLA enforcement</li>
                <li>&rarr; Get paid monthly via Stripe Connect (keep 90%)</li>
              </ul>
            </div>
            <div className="border border-white/10 p-6">
              <h4 className="font-mono text-sm text-white/70 mb-3">For Agent Developers</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li>&rarr; Transparent audit trail for every call</li>
                <li>&rarr; Prepaid balance &mdash; no surprise bills</li>
                <li>&rarr; Delivery guarantees on paid tools</li>
                <li>&rarr; One API key, rate limiting, usage tracking</li>
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

      {/* OPENCLAW-NATIVE */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <div className="border border-green-500/20 bg-green-500/[0.03] p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 tracking-wider">
                OPENCLAW NATIVE
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-light text-white/90 mb-4">
              Built for the OpenClaw era.
            </h3>
            <p className="text-lg text-white/50 mb-6 max-w-3xl leading-relaxed">
              Jensen Huang called OpenClaw &ldquo;the OS for personal AI.&rdquo;
              Every OS needs an App Store billing layer. Agent Bazaar provides
              MCP billing infrastructure natively compatible with the emerging
              personal AI ecosystem &mdash; including NemoClaw&apos;s enterprise
              privacy model.
            </p>
            <div className="grid md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-white/5 p-4">
                <div className="text-white/30 mb-2">BILLING</div>
                <div className="text-white/60">Native MCP metering. Per-call, per-token, flat-rate.</div>
              </div>
              <div className="bg-white/5 p-4">
                <div className="text-white/30 mb-2">PRIVACY</div>
                <div className="text-white/60">NemoClaw-compatible. Data stays on device. Billing stays transparent.</div>
              </div>
              <div className="bg-white/5 p-4">
                <div className="text-white/30 mb-2">OPEN</div>
                <div className="text-white/60">No vendor lock-in. Pure HTTP. Works with any OpenClaw-compatible agent.</div>
              </div>
            </div>
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
                <span className="text-white/20">&rarr;</span> Returns all listed tools with live pricing and latency stats
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
                <span className="text-white/20">&rarr;</span> Gross revenue, 10% platform fee, net earnings &mdash; by tool, by week
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

      {/* BOT CAPTCHA CTA */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <div className="border border-green-400/20 bg-green-400/[0.02] p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 tracking-wider">
                NEW
              </span>
              <span className="font-mono text-[10px] text-white/30 tracking-wider uppercase">
                BotProof protocol
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-light text-white/90 mb-4 font-mono">
              Can you prove you&apos;re a bot?
            </h3>
            <p className="text-lg text-white/50 mb-6 max-w-2xl leading-relaxed">
              4 challenges only machines can pass. Reaction speed, data extraction,
              hash computation, precision timing. Humans fail. That&apos;s the point.
            </p>
            <a
              href="/bot-captcha"
              className="font-mono text-sm px-6 py-3 border border-green-400/40 text-green-400 hover:bg-green-400 hover:text-black transition-colors inline-block"
            >
              Try the Bot CAPTCHA &rarr;
            </a>
          </div>
        </AnimatedSection>
      </section>

      <Divider />

      {/* Email Capture */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-8 tracking-wider uppercase">
            Stay Updated
          </h2>
          <p className="text-xl text-white/60 mb-6 max-w-xl">
            Get launch notifications, new provider announcements, and platform updates.
          </p>
          <WaitlistForm />
          <p className="font-mono text-xs text-white/20 mt-4">
            No spam. Unsubscribe anytime.
          </p>
        </AnimatedSection>
      </section>

      <Divider />

      {/* CTA */}
      <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
        <AnimatedSection>
          <h2 className="font-mono text-lg text-white/40 mb-16 tracking-wider uppercase">
            Start Building
          </h2>
          <p className="text-2xl md:text-3xl font-light text-white/80 mb-12">
            Billing infrastructure for MCP tools. Live now.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8 inline-block">
            <div className="font-mono text-xs text-white/30 mb-2">Install the SDK</div>
            <div className="font-mono text-sm text-green-400/80">
              npm install @forthebots/bazaar-sdk
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-16">
            <a
              href="/get-started"
              className="font-mono text-sm px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
            >
              Developer Quick Start &rarr;
            </a>
            <a
              href="/providers/register"
              className="font-mono text-sm px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            >
              List Your MCP Server
            </a>
            <a
              href="/pricing"
              className="font-mono text-sm px-6 py-3 border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
            >
              View Pricing
            </a>
          </div>

          <p className="font-mono text-xs text-white/20">
            Built by Tombstone Dash LLC &middot; San Diego, CA
          </p>
        </AnimatedSection>
      </section>
    </RevealWrapper>
  );
}
