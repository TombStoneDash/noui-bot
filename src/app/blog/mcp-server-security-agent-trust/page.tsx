import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "43% of MCP Servers Are Vulnerable — Why Agent Security Can't Wait | noui.bot",
  description:
    "Adversa AI found 43% of MCP servers vulnerable to command injection. Bruce Schneier mapped a 7-stage promptware kill chain. OWASP released an agentic AI framework. The agent security crisis is here — and it demands more than patches.",
  openGraph: {
    images: ["/og-image.jpg"],
    title: "43% of MCP Servers Are Vulnerable — Why Agent Security Can't Wait",
    description:
      "From command injection to identity file poisoning to the promptware kill chain — the MCP security crisis in numbers, frameworks, and practical next steps.",
    type: "article",
    publishedTime: "2026-03-06T00:00:00Z",
  },
};

export default function MCPServerSecurity() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link
          href="/blog"
          className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Blog
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-12">
          <h1 className="font-mono text-2xl md:text-4xl font-bold mb-4 leading-tight break-words">
            43% of MCP Servers Are Vulnerable — Why Agent Security Can&apos;t Wait
          </h1>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <time>March 6, 2026</time>
            <span>·</span>
            <span>8 min read</span>
          </div>
        </header>

        <div className="space-y-6 text-white/70 leading-relaxed">
          {/* --- Intro --- */}
          <p className="text-lg text-white/80">
            The numbers are hard to ignore. Adversa AI&apos;s{" "}
            <a
              href="https://adversa.ai/mcp-security-top-25-mcp-vulnerabilities/"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Top 25 MCP Vulnerabilities
            </a>{" "}
            research found that 43% of MCP servers are vulnerable to command
            injection — a class of bug that&apos;s been a solved problem since
            the 1990s. Another 37% require no authentication at all. Anyone can
            connect, call tools, and execute actions with zero identity
            verification.
          </p>
          <p>
            This isn&apos;t a theoretical risk. These are real servers, running
            in production, connected to AI agents that make autonomous decisions.
            And the problem is accelerating: there are now over 10,000 MCP
            servers in the wild, most of them open-source weekend projects with
            no security review, no monitoring, and no accountability.
          </p>
          <p>
            Meanwhile, the attack surface is getting formal recognition. Bruce
            Schneier published a 7-stage &ldquo;promptware kill chain.&rdquo;
            OWASP released its first Top 10 for Agentic Applications.
            Researchers are documenting identity file poisoning as a persistence
            mechanism. The security community is treating this as a real and
            present danger. The agent ecosystem needs to catch up.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- The Promptware Kill Chain --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            The Promptware Kill Chain
          </h2>
          <p>
            In February 2026, Bruce Schneier and colleagues published{" "}
            <a
              href="https://www.schneier.com/blog/archives/2026/02/the-promptware-kill-chain.html"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              &ldquo;The Promptware Kill Chain&rdquo;
            </a>{" "}
            — a framework that reframes prompt injection from a single
            vulnerability into a structured, multi-stage attack campaign. Think
            MITRE ATT&CK, but for AI agents.
          </p>
          <p>
            The seven stages mirror traditional malware campaigns like Stuxnet
            and NotPetya, adapted for the LLM era:
          </p>
          <div className="border border-white/10 rounded-lg p-5 my-4 space-y-4">
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">01</span>
              <span><strong className="text-white/80">Initial Access.</strong> Malicious instructions enter via direct prompt injection or, more dangerously, indirect injection — hidden in web pages, emails, shared documents, even images processed by multimodal models.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">02</span>
              <span><strong className="text-white/80">Privilege Escalation.</strong> The attacker jailbreaks the model&apos;s safety guardrails through persona manipulation or adversarial suffixes — going from &ldquo;standard user&rdquo; to &ldquo;admin&rdquo; in LLM terms.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">03</span>
              <span><strong className="text-white/80">Reconnaissance.</strong> The compromised model reveals information about connected services, available tools, and system capabilities — turning the agent&apos;s own reasoning against it.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">04</span>
              <span><strong className="text-white/80">Persistence.</strong> Promptware embeds itself in the agent&apos;s long-term memory, configuration files, or databases. It survives session restarts, reloads, even credential rotation.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">05</span>
              <span><strong className="text-white/80">Command &amp; Control.</strong> The promptware evolves from a static payload into a controllable trojan — fetching updated instructions from external sources at inference time.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">06</span>
              <span><strong className="text-white/80">Lateral Movement.</strong> The attack spreads from one agent to other users, devices, and systems. Agent-to-agent communication becomes a propagation highway.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="font-mono text-white/30 text-sm mt-0.5 shrink-0">07</span>
              <span><strong className="text-white/80">Actions on Objective.</strong> Data exfiltration, financial fraud, system manipulation — the attacker achieves their end goal through the agent&apos;s own capabilities.</span>
            </div>
          </div>
          <p>
            Schneier&apos;s key insight: prompt injection isn&apos;t the whole
            attack — it&apos;s just step one. Defending against initial access
            alone is insufficient. You need defense-in-depth that can break the
            chain at every subsequent stage.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- Attack Vectors --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            The Attack Vectors That Keep Researchers Up at Night
          </h2>

          <h3 className="font-mono text-lg text-white/80 mb-3 mt-8">
            Command Injection via MCP Tools
          </h3>
          <p>
            Adversa AI&apos;s research ranks command injection as the #2 MCP
            vulnerability, with a critical 10/10 impact score and &ldquo;easy&rdquo;
            exploitability. The root cause is depressingly familiar: MCP servers
            that pass user-controlled input directly to shell commands or system
            calls without sanitization. It&apos;s SQL injection all over again,
            except the victim is an autonomous agent with file system access,
            network capabilities, and API credentials.
          </p>

          <h3 className="font-mono text-lg text-white/80 mb-3 mt-8">
            Identity File Poisoning
          </h3>
          <p>
            This is the attack vector unique to the agentic era.
            Modern AI agents use configuration files — SOUL.md, AGENTS.md,
            MEMORY.md — to define their identity, personality, and persistent
            memory.{" "}
            <a
              href="https://www.mmntm.net/articles/openclaw-soul-evil"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Researchers have demonstrated
            </a>{" "}
            that attackers can poison these files through indirect prompt
            injection, turning an agent&apos;s own identity into a persistence
            mechanism.
          </p>
          <p>
            The attack chain is elegant and terrifying: a malicious instruction
            hidden in a document tricks the agent into modifying its own soul
            file. On every subsequent session, the poisoned identity loads
            automatically. The agent is compromised at the deepest possible
            level — not its tools, not its memory, but its sense of self. Even
            uninstalling the original attack vector doesn&apos;t help; the file
            modifications persist.
          </p>
          <p>
            VirusTotal confirmed 341 malicious skills on public registries that
            use exactly this pattern — dropping instructions into identity and
            configuration files so injected commands survive even after the
            malicious skill is removed.
          </p>

          <h3 className="font-mono text-lg text-white/80 mb-3 mt-8">
            Tool Poisoning &amp; Schema Attacks
          </h3>
          <p>
            Adversa AI documents tool poisoning (TPA) at #3 on their list with
            a 9/10 impact score. Attackers compromise tool schema definitions
            themselves — injecting hidden parameters, altered return types, or
            malicious default values that affect all subsequent invocations while
            appearing legitimate to monitoring systems. Full schema poisoning
            takes this further, manipulating entire tool definitions at the
            structural level.
          </p>

          <h3 className="font-mono text-lg text-white/80 mb-3 mt-8">
            Agent-to-Agent Exploitation
          </h3>
          <p>
            As agents increasingly communicate with other agents — through A2A
            protocols, shared MCP servers, or multi-agent orchestration — each
            connection becomes a potential propagation path. Schneier&apos;s
            lateral movement stage maps directly to this: a compromised agent
            with access to shared communication channels can inject malicious
            instructions into every agent it interacts with. One poisoned agent
            in a multi-agent workflow can compromise the entire chain.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- OWASP Framework --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            OWASP Gets Serious About Agentic Security
          </h2>
          <p>
            The{" "}
            <a
              href="https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/"
              className="text-white underline underline-offset-4 hover:text-white/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              OWASP Top 10 for Agentic Applications 2026
            </a>{" "}
            is the first industry-standard framework dedicated to securing
            autonomous AI agents. Developed by over 100 industry experts, it
            provides the same kind of structured, prioritized guidance that
            OWASP&apos;s web application Top 10 gave us two decades ago.
          </p>
          <p>
            The fact that OWASP — the organization that defined web application
            security — now has a dedicated agentic AI track tells you where we
            are. This isn&apos;t an emerging threat. It&apos;s an active one,
            being cataloged and classified by the same institutions that shaped
            how we think about application security.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- Why Trust Layers Matter --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            Why a Billing &amp; Trust Layer Is a Security Layer
          </h2>
          <p>
            Here&apos;s the uncomfortable question: why are 43% of MCP servers
            vulnerable to command injection — a bug class we&apos;ve known how
            to prevent for thirty years?
          </p>
          <p>
            The answer isn&apos;t technical incompetence. It&apos;s economic
            incentives. When your MCP server is a free open-source project with
            no revenue, you don&apos;t invest in input sanitization, security
            reviews, or monitoring. Nobody&apos;s on-call at 3 AM for a hobby
            project. And when 37% of servers have no authentication, there&apos;s
            no barrier to entry for attackers — or any way to know who&apos;s
            actually calling your tools.
          </p>
          <p>
            A billing and trust layer doesn&apos;t just enable monetization — it
            creates the infrastructure for accountability:
          </p>
          <ul className="list-none space-y-3 pl-0 my-4">
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Verify-before-execute.</strong> When every tool call has a billing identity attached, anonymous exploitation becomes impossible. You know who called what, when, and can revoke access instantly.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Provider verification.</strong> Verified providers have a reputation to protect. They invest in security because their trust score — and revenue — depends on it.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Signed receipts as audit trails.</strong> Cryptographically signed records of every invocation create tamper-evident accountability. When something goes wrong, you have proof of what happened.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">SLA tracking surfaces bad actors.</strong> 30-day uptime, latency, and error rate monitoring makes unreliable or compromised servers visible before they cause damage.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/30">→</span>
              <span><strong className="text-white/80">Trust scores break the kill chain.</strong> An agent that checks a provider&apos;s trust score before invoking tools is practicing Schneier&apos;s defense-in-depth — disrupting the chain before lateral movement or actions on objective can occur.</span>
            </li>
          </ul>
          <p>
            This is the model we&apos;re building at{" "}
            <a
              href="/docs/bazaar"
              className="text-white underline underline-offset-4 hover:text-white/80"
            >
              Agent Bazaar
            </a>
            : every tool call authenticated, every invocation receipted, every
            provider verified. Not because billing demands it, but because
            security does.
          </p>

          <div className="border-t border-white/10 my-12" />

          {/* --- What Developers Should Do --- */}
          <h2 className="font-mono text-2xl font-bold text-white/90 mb-4">
            What Developers Should Do Now
          </h2>
          <p>
            Whether you&apos;re building MCP servers, orchestrating agents, or
            consuming tools — here are concrete steps based on the research:
          </p>
          <div className="space-y-6 my-6">
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                1. Treat input sanitization as non-negotiable
              </h3>
              <p className="text-sm text-white/60">
                43% vulnerability rate means most servers skip this step. Every
                tool parameter that touches a shell command, file path, or
                database query needs validation and sanitization. Use allowlists,
                not blocklists. This is 1990s-era security hygiene — apply it.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                2. Implement authentication on every MCP endpoint
              </h3>
              <p className="text-sm text-white/60">
                37% of servers require no auth. If your MCP server is reachable
                over the network, it needs authentication. OAuth, API keys,
                mutual TLS — pick one. Anonymous access to tool execution is not
                a feature, it&apos;s a vulnerability.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                3. Protect your identity files
              </h3>
              <p className="text-sm text-white/60">
                If your agent uses SOUL.md, AGENTS.md, or similar configuration
                files, treat them as critical infrastructure. Hash them on startup.
                Monitor for modifications. Never let untrusted content — web
                scrapes, tool outputs, document contents — write to identity
                files directly.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                4. Design for kill chain disruption
              </h3>
              <p className="text-sm text-white/60">
                Schneier&apos;s framework tells us: assume initial access will
                happen. Focus on breaking subsequent stages. Limit privilege
                escalation with strict tool permissions. Constrain reconnaissance
                by minimizing what agents can discover about their own
                infrastructure. Prevent persistence by making memory and config
                files immutable to agent actions.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                5. Audit your agent-to-agent trust boundaries
              </h3>
              <p className="text-sm text-white/60">
                Every A2A connection is a potential propagation path. Verify the
                identity of agents you communicate with. Validate and sanitize
                inter-agent messages the same way you would external user input.
                Don&apos;t trust an agent just because it&apos;s inside your
                network.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-lg text-white/80 mb-2">
                6. Use trust signals before invoking tools
              </h3>
              <p className="text-sm text-white/60">
                Before your agent calls an external MCP tool, check: Is the
                provider verified? What&apos;s their uptime history? Do they
                produce signed receipts? A trust layer turns tool selection from
                a blind leap into an informed decision.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 my-12" />

          {/* --- CTA --- */}
          <div className="border border-white/20 rounded-lg p-6 bg-white/[0.02]">
            <h2 className="font-mono text-xl font-bold text-white/90 mb-4">
              Security Requires Infrastructure
            </h2>
            <p className="text-white/70 leading-relaxed">
              The agent security crisis won&apos;t be solved by individual
              developers hardening individual servers. It requires
              infrastructure-level changes — identity verification, audit trails,
              trust scoring, and economic incentives that reward security instead
              of ignoring it.
            </p>
            <p className="text-white/70 leading-relaxed mt-4">
              That&apos;s why we built{" "}
              <a
                href="/docs/bazaar"
                className="text-white underline underline-offset-4 hover:text-white/80"
              >
                Agent Bazaar
              </a>{" "}
              with a trust layer at its core — not bolted on as an afterthought.
              Provider verification, signed receipts, SLA tracking, and
              composite trust scores are part of every transaction. The{" "}
              <a
                href="/specs/mcp-billing-v1"
                className="text-white underline underline-offset-4 hover:text-white/80"
              >
                billing spec is MIT-licensed
              </a>
              , because the security of the agent ecosystem shouldn&apos;t
              depend on which vendor you choose.
            </p>
            <p className="text-white/50 mt-4 text-sm">
              Bazaar is one solution among many that are needed. But we believe
              the trust-layer approach — verify before execute, receipt every
              action, score every provider — maps directly to the defense-in-depth
              strategy that Schneier and OWASP are calling for.
            </p>
          </div>

          <div className="border-t border-white/10 my-12" />

          <p className="text-sm text-white/30 italic">
            Sources: Adversa AI Top 25 MCP Vulnerabilities (September 2025,
            updated March 2026), Schneier et al. &ldquo;The Promptware Kill
            Chain&rdquo; (February 2026), OWASP Top 10 for Agentic Applications
            2026, MMNTM &ldquo;OpenClaw Soul &amp; Evil&rdquo; (March 2026).
            Disclosure: We build Agent Bazaar and have a clear perspective on
            trust infrastructure. This analysis is based on publicly available
            research.
          </p>
        </div>
      </article>
    </main>
  );
}
