"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WaitlistForm } from "@/components/WaitlistForm";

function BazaarStatus() {
  const [status, setStatus] = useState<{ tools: number; providers: number } | null>(null);
  useEffect(() => {
    fetch("/api/bazaar/catalog")
      .then((r) => r.json())
      .then((d) => {
        const tools = d.tools?.length ?? 0;
        const providerSet = new Set(d.tools?.map((t: any) => t.provider?.id).filter(Boolean));
        setStatus({ tools, providers: providerSet.size });
      })
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div className="inline-flex items-center gap-3 font-mono text-xs text-white/40 border border-white/10 px-4 py-2">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span>
        {status.tools} tools live from {status.providers} provider{status.providers !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

export default function Home() {
  const [revealed, setRevealed] = useState(false);
  const humanRef = useRef<HTMLDivElement>(null);

  const handleReveal = () => {
    setRevealed(true);
    setTimeout(() => {
      humanRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 800);
  };

  return (
    <main className="relative">
      {/* THE VOID */}
      <section className="relative h-screen w-full bg-black flex items-end justify-end">
        <AnimatePresence>
          {!revealed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.5, duration: 1 }}
              onClick={handleReveal}
              className="fixed bottom-8 right-8 font-mono text-[11px] tracking-wider z-50"
              style={{ color: "#333333" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#333333")}
            >
              I&apos;m human? Press here. &rarr;
            </motion.button>
          )}
        </AnimatePresence>

        {revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="font-mono text-[11px] tracking-wider"
              style={{ color: "#333333" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#333333")}
            >
              &larr; return to void
            </button>
          </motion.div>
        )}
      </section>

      {/* THE REVEAL — Light line expanding */}
      <AnimatePresence>
        {revealed && (
          <>
            {/* Horizontal light line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="fixed top-1/2 left-0 right-0 h-px bg-white/20 z-40 origin-center pointer-events-none"
              style={{ transform: "translateY(-50%)" }}
            />

            {/* THE HUMAN VIEW */}
            <motion.div
              ref={humanRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
            >
              {/* HERO */}
              <section className="min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24 max-w-5xl">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
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
                </motion.div>
              </section>

              {/* THE PROBLEM */}
              <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
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
                </motion.div>
              </section>

              {/* Divider */}
              <div className="mx-6 md:mx-16 lg:mx-24 max-w-5xl">
                <div className="h-px bg-white/10" />
              </div>

              {/* THE SOLUTION */}
              <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
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
                </motion.div>
              </section>

              {/* Divider */}
              <div className="mx-6 md:mx-16 lg:mx-24 max-w-5xl">
                <div className="h-px bg-white/10" />
              </div>

              {/* AGENT BAZAAR */}
              <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
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
                      href="/api/bazaar"
                      className="font-mono text-sm px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
                    >
                      Explore the API
                    </a>
                    <a
                      href="/api/bazaar/catalog"
                      className="font-mono text-sm px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
                    >
                      Browse Tool Catalog &rarr;
                    </a>
                  </div>
                </motion.div>
              </section>

              {/* Divider */}
              <div className="mx-6 md:mx-16 lg:mx-24 max-w-5xl">
                <div className="h-px bg-white/10" />
              </div>

              {/* DAISY'S STORY */}
              <section className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
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
                </motion.div>
              </section>

              {/* Divider */}
              <div className="mx-6 md:mx-16 lg:mx-24 max-w-5xl">
                <div className="h-px bg-white/10" />
              </div>

              {/* WAITLIST */}
              <section id="waitlist" className="px-6 md:px-16 lg:px-24 py-24 max-w-5xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                >
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
                </motion.div>
              </section>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

function ProblemCard({
  title,
  description,
  delay,
}: {
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="border-t border-white/10 pt-6"
    >
      <h3 className="font-mono text-sm text-white/80 mb-3">{title}</h3>
      <p className="text-white/40 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

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

function SolutionBlock({
  title,
  description,
  delay,
}: {
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="flex gap-4"
    >
      <span className="font-mono text-white/20 text-sm mt-1 shrink-0">&rarr;</span>
      <div>
        <h3 className="font-mono text-base text-white/90 mb-2">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed max-w-2xl">{description}</p>
      </div>
    </motion.div>
  );
}
