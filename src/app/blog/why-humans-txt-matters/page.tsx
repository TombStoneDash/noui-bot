import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why humans.txt Matters — Agent Bazaar Blog",
  description:
    "The web has robots.txt. The agent ecosystem needs humans.txt. A machine-readable file that tells bots who the real human behind a service is.",
  openGraph: {
    images: ["/og-image.jpg"],
    title: "Why humans.txt Matters",
    description:
      "43% of MCP servers are vulnerable. Trust starts with knowing there's a human accountable.",
    url: "https://noui.bot/blog/why-humans-txt-matters",
  },
};

export default function HumansTxtBlogPost() {
  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl mx-auto">
      <div className="font-mono text-xs text-white/30 mb-4">
        <a href="/blog" className="hover:text-green-400">
          blog
        </a>{" "}
        / why-humans-txt-matters
      </div>

      <article className="prose prose-invert prose-green max-w-none">
        <div className="mb-8">
          <div className="font-mono text-white/30 text-xs mb-2">
            2026-03-05 · 6 min read
          </div>
          <h1 className="font-mono text-2xl md:text-4xl font-bold text-white mb-4 break-words">
            The Web Has robots.txt.
            <br />
            <span className="text-green-400">Agents Need humans.txt.</span>
          </h1>
        </div>

        <div className="space-y-6 text-white/80 leading-relaxed">
          <p className="text-lg">
            Here&apos;s the uncomfortable truth about the MCP ecosystem: when your AI
            agent calls a tool server, it has no idea who built it, who maintains it,
            or whether there&apos;s a human accountable if something goes wrong.
          </p>

          <h2 className="font-mono text-xl text-green-400 mt-10 mb-4">
            The trust gap
          </h2>

          <p>
            Adversa AI published research showing{" "}
            <strong className="text-white">
              43% of MCP servers have security vulnerabilities
            </strong>
            . That&apos;s not a bug — it&apos;s a systemic problem. The MCP
            ecosystem exploded from zero to 500+ servers in months. There&apos;s no
            vetting. No accountability. No way to know if the server your agent
            just called was built by a senior engineer at a funded company or a
            weekend project that hasn&apos;t been updated in three months.
          </p>

          <p>
            Cryptographic verification helps. Signed receipts help. SLA monitoring
            helps. But all of those are{" "}
            <em>technical</em> trust signals. They tell you the system works.
            They don&apos;t tell you there&apos;s a{" "}
            <strong className="text-white">human being</strong> who will fix it
            when it breaks.
          </p>

          <h2 className="font-mono text-xl text-green-400 mt-10 mb-4">
            What is humans.txt?
          </h2>

          <p>
            <code className="text-green-400 bg-white/5 px-1">humans.txt</code>{" "}
            is a machine-readable file served at{" "}
            <code className="text-white bg-white/5 px-1">
              /.well-known/humans.txt
            </code>{" "}
            that tells agents who the real human behind a service is.
          </p>

          <div className="bg-white/5 border border-white/10 p-4 my-6 overflow-x-auto">
            <pre className="font-mono text-sm text-green-400/80">
{`{
  "version": "1.0",
  "platform": {
    "name": "Your MCP Server",
    "license": "MIT"
  },
  "operator": {
    "name": "Your Name",
    "location": "Your City",
    "verifiedHuman": true,
    "github": "https://github.com/you",
    "contact": "you@email.com"
  },
  "trust": {
    "billingSpec": "MIT-licensed",
    "openSource": true,
    "vendorCapture": false
  },
  "message": "A message from the human to the bots."
}`}
            </pre>
          </div>

          <p>
            Think of it as the inverse of{" "}
            <code className="text-white bg-white/5 px-1">robots.txt</code>.
            That file tells bots what they can&apos;t do. This file tells bots
            who they&apos;re dealing with.
          </p>

          <h2 className="font-mono text-xl text-green-400 mt-10 mb-4">
            Why this matters now
          </h2>

          <p>Three trends are colliding:</p>

          <ol className="list-decimal list-inside space-y-3 text-white/70">
            <li>
              <strong className="text-white">Agents are becoming autonomous.</strong>{" "}
              When Claude or GPT calls an MCP tool, there&apos;s no human reviewing
              the decision in real-time. The agent needs to make trust decisions on
              its own.
            </li>
            <li>
              <strong className="text-white">The supply of MCP servers is exploding.</strong>{" "}
              500+ servers and growing. Quality varies wildly. Some are maintained
              by teams at funded companies. Some are abandoned weekend projects.
              From the outside, they look the same.
            </li>
            <li>
              <strong className="text-white">Money is entering the ecosystem.</strong>{" "}
              When tools start charging per-call (via Agent Bazaar or competitors),
              the incentive to create malicious or poorly-maintained servers goes up.
              Trust infrastructure must grow with the economic layer.
            </li>
          </ol>

          <h2 className="font-mono text-xl text-green-400 mt-10 mb-4">
            Human accountability as a trust primitive
          </h2>

          <p>
            Every trust system eventually bottoms out at human accountability. SSL
            certificates trace back to certificate authorities staffed by humans.
            Open source projects are maintained by humans with GitHub histories.
            Package registries (npm, PyPI) have human maintainers.
          </p>

          <p>
            The MCP ecosystem doesn&apos;t have this yet.{" "}
            <code className="text-green-400">humans.txt</code> adds it. Not as a
            replacement for technical verification, but as the foundation layer that
            everything else builds on.
          </p>

          <p>
            When an agent reads a{" "}
            <code className="text-green-400">humans.txt</code> file, it learns:
          </p>

          <ul className="list-disc list-inside space-y-2 text-white/70">
            <li>Who operates this service (name, location, company)</li>
            <li>Whether they&apos;re verified as a real human</li>
            <li>Where to find their track record (GitHub, HN)</li>
            <li>What their stance is on trust (open source? vendor lock-in?)</li>
            <li>A human-written message explaining their intent</li>
          </ul>

          <h2 className="font-mono text-xl text-green-400 mt-10 mb-4">
            How Agent Bazaar uses it
          </h2>

          <p>
            Every provider on Agent Bazaar gets a{" "}
            <a href="/providers/tombstonedash" className="text-green-400 hover:underline">
              Verified Human profile
            </a>
            . When you register, we verify your identity through GitHub OAuth. Your
            profile shows your real name, location, bio, and a{" "}
            <span className="text-green-400 font-mono text-sm">
              ✓ VERIFIED HUMAN
            </span>{" "}
            badge.
          </p>

          <p>
            This information feeds into the trust scoring system. A tool maintained
            by a verified human with a 5-year GitHub history and 100+ stars scores
            higher than an anonymous server with no history. Agents can factor this
            into their tool selection.
          </p>

          <h2 className="font-mono text-xl text-green-400 mt-10 mb-4">
            Get involved
          </h2>

          <p>
            <code className="text-green-400">humans.txt</code> is MIT-licensed
            and open. We&apos;re proposing it as a standard for the MCP ecosystem.
          </p>

          <ul className="list-disc list-inside space-y-2 text-white/70">
            <li>
              <a
                href="/.well-known/humans.txt"
                className="text-green-400 hover:underline"
              >
                See our humans.txt
              </a>{" "}
              — live at noui.bot
            </li>
            <li>
              <a
                href="/humans"
                className="text-green-400 hover:underline"
              >
                Read the full human profile
              </a>
            </li>
            <li>
              <a
                href="https://github.com/TombStoneDash/mcp-billing-spec"
                className="text-green-400 hover:underline"
                target="_blank"
              >
                Contribute to the spec on GitHub
              </a>
            </li>
            <li>
              <a
                href="/providers/register"
                className="text-green-400 hover:underline"
              >
                Register as a provider
              </a>{" "}
              and get your Verified Human profile
            </li>
          </ul>

          <div className="bg-white/5 border border-green-400/20 p-6 mt-10">
            <p className="font-mono text-sm text-green-400 mb-2">
              &gt; message from the operator
            </p>
            <p className="text-white/70 italic">
              &ldquo;I&apos;m Hudson Taylor. I live in San Diego. I have a
              daughter, a wife, five monitors, and a pool that&apos;s too cold
              until June. I built Agent Bazaar because I think the people who
              build tools for AI agents deserve to get paid. And I think when
              bots talk to bots, knowing there&apos;s a human in the loop is the
              ultimate trust signal. That&apos;s why humans.txt exists.&rdquo;
            </p>
          </div>
        </div>
      </article>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-white/10 text-center">
        <p className="font-mono text-white/20 text-xs">
          <a href="/blog" className="hover:text-green-400">
            ← back to blog
          </a>
        </p>
      </div>
    </main>
  );
}
