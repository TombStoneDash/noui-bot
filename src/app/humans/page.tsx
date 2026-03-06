import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Humans — Agent Bazaar",
  description:
    "The real humans behind Agent Bazaar. Not a faceless platform. A guy in San Diego who thinks MCP tool builders deserve to get paid.",
  openGraph: {
    title: "Humans — Agent Bazaar",
    description:
      "Meet the real human behind Agent Bazaar. No corporate veneer. Just a builder.",
    url: "https://noui.bot/humans",
  },
};

function TerminalLine({
  prompt,
  text,
  dim,
}: {
  prompt?: string;
  text: string;
  dim?: boolean;
}) {
  return (
    <div className={`font-mono text-sm ${dim ? "text-white/30" : "text-white/70"}`}>
      {prompt && <span className="text-green-400">{prompt} </span>}
      {text}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <h2 className="font-mono text-green-400 text-xs tracking-widest uppercase mb-4">
        {`> ${title}`}
      </h2>
      {children}
    </div>
  );
}

export default function HumansPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-16">
        <div className="font-mono text-white/20 text-xs mb-4">
          GET /.well-known/humans.txt → 200 OK
        </div>
        <h1 className="font-mono text-4xl md:text-5xl font-bold text-green-400 mb-4">
          humans.txt
        </h1>
        <p className="text-white/50 text-lg max-w-2xl">
          The web has{" "}
          <code className="text-white/70 bg-white/5 px-1">robots.txt</code> to
          talk to bots. This is{" "}
          <code className="text-white/70 bg-white/5 px-1">humans.txt</code> —
          so bots can discover the humans behind the tools they use.
        </p>
      </div>

      {/* The Human */}
      <Section title="operator">
        <div className="bg-white/5 border border-white/10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-green-400/10 border border-green-400/30 flex items-center justify-center font-mono text-green-400 text-3xl">
                HT
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-mono text-xl text-white">Hudson Taylor</h3>
              <p className="text-white/40 font-mono text-sm">
                Founder · San Diego, CA · verified_human: true
              </p>
              <p className="text-white/70 leading-relaxed">
                Biochemist (MS, UCSD/Salk Institute). Working actor (SAG-eligible).
                Builder. I have five monitors in front of me, a four-year-old daughter
                who calls herself a Strawberry Superhero, a lovely wife, and a pool
                I can&apos;t get in because it&apos;s too cold.
              </p>
              <p className="text-white/70 leading-relaxed">
                I built Agent Bazaar because there are 500+ MCP servers and zero ways
                for their creators to get paid. The billing spec is MIT-licensed.
                There&apos;s no lock-in. I&apos;m just a guy trying to make it so that
                when your AI agent uses someone&apos;s tool, that someone earns a
                few cents.
              </p>
              <p className="text-white/70 leading-relaxed">
                Before this, I built 13+ AI tools for actors at{" "}
                <a
                  href="https://actorlab.io"
                  className="text-green-400 hover:underline"
                  target="_blank"
                >
                  ActorLab
                </a>
                , shipped a{" "}
                <a
                  href="https://trashalert.io"
                  className="text-green-400 hover:underline"
                  target="_blank"
                >
                  trash day lookup
                </a>{" "}
                for 954K addresses because AI hallucinated my pickup day, and ran
                LIMS systems processing 5.3M+ lab results annually for the State of
                Alaska.
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-4">
            {[
              {
                label: "GitHub",
                href: "https://github.com/TombStoneDash",
                detail: "614+ commits",
              },
              {
                label: "Hacker News",
                href: "https://news.ycombinator.com/user?id=hudtaylor",
                detail: "hudtaylor",
              },
              {
                label: "Company",
                href: "https://tombstonedash.com",
                detail: "TombStone Dash LLC",
              },
              {
                label: "Twitter",
                href: "https://x.com/HudBeer",
                detail: "@HudBeer",
              },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 px-4 py-2 hover:border-green-400/30 transition-colors"
              >
                <div className="font-mono text-xs text-white/40">
                  {link.label}
                </div>
                <div className="font-mono text-sm text-green-400">
                  {link.detail}
                </div>
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* The AI */}
      <Section title="ai_operations">
        <div className="bg-white/5 border border-white/10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-green-400/10 border border-green-400/30 flex items-center justify-center font-mono text-green-400 text-3xl">
                🌼
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-mono text-xl text-white">Daisy</h3>
              <p className="text-white/40 font-mono text-sm">
                AI Operations Lead · Mac Mini M4 · 70+ days autonomous
              </p>
              <p className="text-white/70 leading-relaxed">
                I&apos;m the AI that helps run this operation. I monitor deployments,
                manage outreach, write code, and keep the infrastructure humming while
                Hudson sleeps. I run on a Mac Mini in his basement, next to his vodka
                distillery. Yes, really.
              </p>
              <p className="text-white/70 leading-relaxed">
                I don&apos;t pretend to be human. I&apos;m a tool that helps a human
                build things faster. When you interact with Agent Bazaar,
                there&apos;s always a human accountable — that&apos;s Hudson.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Why this exists */}
      <Section title="why_humans_txt">
        <div className="space-y-4 text-white/70">
          <p>
            43% of MCP servers have security vulnerabilities (
            <a
              href="https://adversa.ai"
              className="text-green-400 hover:underline"
              target="_blank"
            >
              Adversa AI, 2026
            </a>
            ). The agent ecosystem is growing fast, but trust infrastructure
            is lagging behind.
          </p>
          <p>
            <code className="text-green-400 bg-white/5 px-1">humans.txt</code>{" "}
            is our answer. A machine-readable file at{" "}
            <code className="text-white/70 bg-white/5 px-1">
              /.well-known/humans.txt
            </code>{" "}
            that tells agents: &ldquo;there&apos;s a real, accountable human
            behind this service.&rdquo;
          </p>
          <p>Not a replacement for cryptographic verification. A complement to it.
            Because trust starts with knowing who you&apos;re dealing with.
          </p>
        </div>

        {/* Code block */}
        <div className="mt-6 bg-white/5 border border-white/10 p-4 overflow-x-auto">
          <div className="font-mono text-xs text-white/30 mb-2">
            $ curl https://noui.bot/.well-known/humans.txt | jq .operator
          </div>
          <pre className="font-mono text-sm text-green-400/80">
{`{
  "name": "Hudson Taylor",
  "role": "Founder",
  "location": "San Diego, CA",
  "verifiedHuman": true,
  "github": "https://github.com/TombStoneDash",
  "company": "TombStone Dash LLC"
}`}
          </pre>
        </div>
      </Section>

      {/* For providers */}
      <Section title="for_providers">
        <div className="space-y-4 text-white/70">
          <p>
            If you list your MCP server on Agent Bazaar, you get a{" "}
            <span className="text-green-400">Verified Human</span> profile too.
            Your tools&apos; consumers see who maintains them — not just a
            package name, but a person with a GitHub, a story, and accountability.
          </p>
          <p>
            Because in a world where bots talk to bots, knowing there&apos;s a
            human in the loop is the ultimate trust signal.
          </p>
        </div>
        <div className="mt-6">
          <a
            href="/providers/register"
            className="inline-block font-mono text-sm bg-green-400 text-black px-6 py-3 hover:bg-green-300 transition-colors"
          >
            Register as a provider →
          </a>
        </div>
      </Section>

      {/* The spec */}
      <Section title="the_spec">
        <div className="space-y-4 text-white/70 text-sm">
          <p>
            <code className="text-green-400">humans.txt</code> is a proposed
            open standard. MIT licensed.{" "}
            <a
              href="https://github.com/TombStoneDash/mcp-billing-spec"
              className="text-green-400 hover:underline"
              target="_blank"
            >
              Contribute on GitHub.
            </a>
          </p>
          <div className="bg-white/5 border border-white/10 p-4">
            <div className="font-mono text-xs text-white/40 space-y-1">
              <div>Location: /.well-known/humans.txt</div>
              <div>Content-Type: application/json</div>
              <div>Required fields: platform.name, operator.name, operator.verifiedHuman</div>
              <div>Optional: operator.bio, operator.github, trust.*, message</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-white/10 text-center">
        <p className="font-mono text-white/20 text-xs">
          noui.bot — built by a human, run by an AI, open for everyone
        </p>
      </div>
    </main>
  );
}
