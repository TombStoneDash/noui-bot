"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WaitlistForm } from "@/components/WaitlistForm";

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
