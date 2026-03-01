"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; noui.bot
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-16 lg:px-24 pb-24 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Product Roadmap
          </h1>
          <p className="text-xl text-white/60 max-w-3xl">
            Three products. One stack. Everything an AI agent needs to operate
            autonomously in the real world.
          </p>
        </motion.div>
      </section>

      {/* The Stack Visual */}
      <section className="px-6 md:px-16 lg:px-24 pb-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h2 className="font-mono text-xs text-white/30 tracking-wider mb-8">
            THE NOUI STACK
          </h2>

          {/* Connection flow */}
          <div className="font-mono text-xs text-white/30 text-center mb-8 leading-relaxed">
            Agents use tools → <span className="text-white/60">Bazaar bills</span> →
            If stuck → <span className="text-white/60">Human Fallback resolves</span> →{" "}
            <span className="text-white/60">BotWall3t handles payments</span>
          </div>
        </motion.div>
      </section>

      {/* Products */}
      <section className="px-6 md:px-16 lg:px-24 pb-24 max-w-5xl space-y-12">
        {/* Agent Bazaar */}
        <ProductCard
          status="building"
          statusLabel="BUILDING"
          number="01"
          name="Agent Bazaar"
          tagline="The monetization layer for AI agent tools"
          description="A billing, metering, and auth proxy that sits in front of MCP servers. Tool builders set pricing. Agent developers get one API key for thousands of tools. We handle the billing."
          features={[
            "Reverse proxy for MCP servers with per-call billing",
            "Provider registration + tool catalog",
            "Consumer API keys with prepaid balance",
            "Usage metering, rate limiting, cost tracking",
            "Monthly invoicing + Stripe Connect payouts",
          ]}
          links={[
            { label: "API Docs", href: "/api/bazaar" },
            { label: "Tool Catalog", href: "/api/bazaar/catalog" },
          ]}
          delay={0}
        />

        {/* BotWall3t */}
        <ProductCard
          status="live"
          statusLabel="LIVE — SCAFFOLDED"
          number="02"
          name="BotWall3t"
          tagline="Give your bot its own money. Don't share your CC."
          description="Agent wallets with spending controls. Fund your agent, set policies, get a full audit trail. Double-entry ledger, hold/release mechanics, and gift links for crowdfunding your agent's budget."
          features={[
            "Double-entry ledger (fund, hold, spend, release, refund)",
            "Policy engine (allowlist, blocklist, daily/monthly caps, auto-approve)",
            "API key auth for autonomous agent spending",
            "Gift links — let anyone fund your agent's wallet",
            "Full audit trail of every transaction",
          ]}
          links={[
            { label: "API Docs", href: "https://botwallet-three.vercel.app/api/v1" },
            { label: "GitHub", href: "https://github.com/TombStoneDash/botwallet" },
          ]}
          delay={0.15}
        />

        {/* Human Fallback */}
        <ProductCard
          status="coming"
          statusLabel="COMING SOON"
          number="03"
          name="Human Fallback Network"
          tagline="When your agent hits a wall, a human finishes the job."
          description="An escalation API for AI agents. When autonomous tools fail — CAPTCHAs, phone calls, niche UIs, identity verification — agents post a task with a reward. Vetted humans claim it, complete it, submit proof, get paid."
          features={[
            "Task posting with structured requirements + reward",
            "Escrow: agent deposits → human completes → proof verified → funds released",
            "Screenshot-as-proof model for verifiable completion",
            "15-min claim SLA with auto-price escalation",
            "Initial scope: web form submission + research tasks",
          ]}
          links={[]}
          delay={0.3}
        />
      </section>

      {/* Timeline */}
      <section className="px-6 md:px-16 lg:px-24 pb-24 max-w-5xl">
        <div className="border-t border-white/10 pt-12">
          <h2 className="font-mono text-xs text-white/30 tracking-wider mb-8">
            TIMELINE
          </h2>
          <div className="space-y-6 font-mono text-sm">
            <TimelineItem
              date="Feb 2026"
              event="BotWall3t scaffolded — 10 tables, 7 API routes, Supabase backend"
              done
            />
            <TimelineItem
              date="Feb 2026"
              event="Agent Bazaar MVP — proxy, catalog, registration, metering"
              done
            />
            <TimelineItem
              date="Mar 2026"
              event="Bazaar Stripe integration — real billing, real payouts"
            />
            <TimelineItem
              date="Mar 2026"
              event="Human Fallback API — task posting, claiming, proof, escrow"
            />
            <TimelineItem
              date="Q2 2026"
              event="SDK packages — @forthebots/bazaar-sdk, @noui/wallet-sdk"
            />
            <TimelineItem
              date="Q2 2026"
              event="Provider + consumer dashboards"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-16 lg:px-24 pb-24 max-w-5xl">
        <div className="border border-white/10 p-8 md:p-12">
          <h2 className="font-mono text-2xl mb-4">Build with us.</h2>
          <p className="text-white/50 mb-8 max-w-2xl">
            We&apos;re looking for MCP server builders who want to monetize their tools,
            and agent developers who need reliable infrastructure.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/#waitlist"
              className="font-mono text-sm px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
            >
              Join the Waitlist
            </Link>
            <Link
              href="/docs"
              className="font-mono text-sm px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            >
              Read the Docs &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/5">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </main>
  );
}

function ProductCard({
  status,
  statusLabel,
  number,
  name,
  tagline,
  description,
  features,
  links,
  delay,
}: {
  status: "live" | "building" | "coming";
  statusLabel: string;
  number: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  links: { label: string; href: string }[];
  delay: number;
}) {
  const statusColors = {
    live: "text-green-400 border-green-400/30",
    building: "text-yellow-400 border-yellow-400/30",
    coming: "text-white/30 border-white/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="border border-white/10 p-8 md:p-10"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="font-mono text-3xl text-white/10">{number}</span>
          <div>
            <h3 className="font-mono text-xl text-white/90">{name}</h3>
            <p className="text-sm text-white/40 mt-1">{tagline}</p>
          </div>
        </div>
        <span
          className={`font-mono text-[10px] tracking-wider px-3 py-1 border ${statusColors[status]}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="text-sm text-white/50 mb-6 max-w-3xl leading-relaxed">
        {description}
      </p>

      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-white/40 flex gap-2">
            <span className="text-white/20">&rarr;</span>
            {f}
          </li>
        ))}
      </ul>

      {links.length > 0 && (
        <div className="flex gap-4 pt-4 border-t border-white/5">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {link.label} &rarr;
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TimelineItem({
  date,
  event,
  done,
}: {
  date: string;
  event: string;
  done?: boolean;
}) {
  return (
    <div className="flex gap-6 items-start">
      <span className="text-white/20 w-20 shrink-0 text-xs pt-0.5">{date}</span>
      <div className="flex gap-3 items-start">
        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${done ? "bg-green-400" : "bg-white/20"}`} />
        <span className={`text-xs ${done ? "text-white/60" : "text-white/30"}`}>{event}</span>
      </div>
    </div>
  );
}
