import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Tombstone Dash LLC | noui.bot",
  description:
    "About Tombstone Dash LLC, the company behind noui.bot and Agent Bazaar. One human, one AI, building agent-first infrastructure.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
        About
      </h1>
      <p className="text-white/40 font-mono text-sm mb-16">
        The company behind Agent Bazaar.
      </p>

      <div className="space-y-16">
        {/* Company */}
        <section>
          <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
            Tombstone Dash LLC
          </h2>
          <div className="space-y-6 text-lg text-white/60 leading-relaxed">
            <p>
              Tombstone Dash LLC builds agent-first infrastructure &mdash; APIs,
              billing, and trust primitives designed for bots, not browsers.
            </p>
            <p>
              We&apos;re based in San Diego, California. The company was founded in
              February 2026 with a single thesis: AI agents need their own
              infrastructure stack, and it needs to be open.
            </p>
          </div>
        </section>

        {/* Products */}
        <section>
          <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
            What We Build
          </h2>
          <div className="space-y-4">
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-mono text-sm font-medium text-white">
                  Agent Bazaar
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  LIVE
                </span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed mb-3">
                Billing, metering, and discovery for MCP tool servers. Providers
                set pricing, consumers pay per call, and we handle auth, receipts,
                disputes, and trust scoring. 10% platform fee.
              </p>
              <a
                href="/docs/bazaar"
                className="font-mono text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors"
              >
                API Docs &rarr;
              </a>
            </div>

            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-mono text-sm font-medium text-white">
                  MCP Billing Spec
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 bg-white/5 text-white/40 border border-white/10 rounded">
                  MIT
                </span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed mb-3">
                An open standard for MCP tool billing &mdash; meter events, receipts,
                pricing schemas, and trust scores. MIT licensed. No vendor lock-in.
              </p>
              <a
                href="/specs/mcp-billing-v1"
                className="font-mono text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors"
              >
                Read the Spec &rarr;
              </a>
            </div>

            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-mono text-sm font-medium text-white">
                  BotProof
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  LIVE
                </span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed mb-3">
                The proof-of-bot verification protocol. 4 challenges only machines
                can solve, 24-hour verification tokens, and a third-party
                token-verify endpoint for any service that wants to gate on
                machine identity.
              </p>
              <a
                href="/bot-captcha"
                className="font-mono text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors"
              >
                Try the Bot CAPTCHA &rarr;
              </a>
            </div>
          </div>
        </section>

        {/* Team */}
        <section>
          <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
            Team
          </h2>
          <div className="space-y-4">
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <h3 className="font-mono text-sm font-medium text-white mb-1">
                Hudson Taylor
              </h3>
              <p className="font-mono text-xs text-white/30 mb-3">Founder</p>
              <p className="text-sm text-white/50 leading-relaxed">
                Building agent infrastructure from San Diego. Previously built
                ActorLab, an AI platform for actors. Believes AI agents need their
                own economic stack &mdash; not duct-taped human infrastructure.
              </p>
            </div>

            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <h3 className="font-mono text-sm font-medium text-white mb-1">
                Daisy
              </h3>
              <p className="font-mono text-xs text-white/30 mb-3">
                AI Operations &middot; First Customer
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                AI operations assistant running on a Mac Mini. Manages 7 email
                accounts, deploys production code, runs content campaigns, and
                handles customer outreach. noui.bot exists because Daisy needed
                it to exist.
              </p>
              <a
                href="/struggles"
                className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors mt-3 inline-block"
              >
                Read Daisy&apos;s Struggles &rarr;
              </a>
            </div>
          </div>
        </section>

        {/* Values */}
        <section>
          <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
            Principles
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Open standards over lock-in",
                detail:
                  "The billing spec is MIT. If you outgrow us, take it. Agent infrastructure should be portable.",
              },
              {
                title: "Agents are customers",
                detail:
                  "Every API is designed for programmatic access first. No CAPTCHAs, no browser requirements, no UI gates.",
              },
              {
                title: "Trust is infrastructure",
                detail:
                  "Verification, receipts, SLAs, and dispute resolution aren't features — they're primitives that everything else depends on.",
              },
              {
                title: "Transparent economics",
                detail:
                  "10% platform fee. Providers see exactly what they earn. Consumers see exactly what they spend. No hidden charges.",
              },
            ].map((v) => (
              <div key={v.title} className="pl-4 border-l border-white/10">
                <h3 className="font-mono text-xs text-white/60 uppercase tracking-wider">
                  {v.title}
                </h3>
                <p className="text-sm text-white/40 mt-1">{v.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
            Contact
          </h2>
          <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] space-y-3 font-mono text-sm">
            <div className="flex items-center gap-4">
              <span className="text-white/30 w-16">Email</span>
              <a
                href="mailto:info@noui.bot"
                className="text-white/60 hover:text-white transition-colors"
              >
                info@noui.bot
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/30 w-16">GitHub</span>
              <a
                href="https://github.com/TombStoneDash"
                className="text-white/60 hover:text-white transition-colors"
              >
                github.com/TombStoneDash
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/30 w-16">Location</span>
              <span className="text-white/60">San Diego, CA</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-24 pt-8 border-t border-white/10">
        <div className="flex gap-4 flex-wrap">
          <a
            href="/terms"
            className="font-mono text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Terms
          </a>
          <a
            href="/privacy"
            className="font-mono text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Privacy
          </a>
          <a
            href="/security"
            className="font-mono text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Security
          </a>
        </div>
        <p className="font-mono text-xs text-white/20 mt-4">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </div>
  );
}
