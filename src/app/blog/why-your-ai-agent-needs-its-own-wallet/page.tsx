import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why Your AI Agent Needs Its Own Wallet (And Why Crypto Isn't the Answer) | noui.bot",
  description: "Coinbase shipped Agentic Wallets. x402 embeds payments in HTTP. But 90% of developers don't want crypto. Here's the case for Stripe-native agent wallets with proper accounting.",
  keywords: ["AI agent wallet", "BotWall3t", "agent spending", "Coinbase agentic wallets", "x402", "agent payments", "AI spending control", "MCP billing"],
  openGraph: {
    title: "Why Your AI Agent Needs Its Own Wallet (And Why Crypto Isn't the Answer)",
    description: "The case for Stripe-native agent wallets with double-entry accounting, policy engines, and gift links.",
    type: "article",
    publishedTime: "2026-02-28T00:00:00Z",
  },
};

export default function AgentWalletBlog() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="px-6 md:px-16 lg:px-24 py-8">
        <Link href="/blog" className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors">
          &larr; Blog
        </Link>
      </nav>

      <article className="px-6 md:px-16 lg:px-24 pb-24 max-w-3xl">
        <header className="mb-16">
          <time className="font-mono text-xs text-white/30">February 28, 2026</time>
          <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-4 leading-tight">
            Why Your AI Agent Needs Its Own Wallet (And Why Crypto Isn&apos;t the Answer)
          </h1>
          <p className="text-lg text-white/50">9 min read</p>
        </header>

        <div className="prose prose-invert max-w-none space-y-6 text-white/70 leading-relaxed">
          <p className="text-xl text-white/80">
            On February 11, Coinbase shipped Agentic Wallets — crypto wallets designed specifically for AI agents. 
            The thesis was clear: agents need money to operate autonomously. Give them a wallet, let them transact on-chain.
          </p>

          <p>
            They&apos;re right about the problem. They&apos;re wrong about the solution — at least for 90% of the market.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">The Problem Is Real</h2>

          <p>
            Right now, when an AI agent needs to spend money — call an API, generate an image, send an email — 
            it uses its owner&apos;s credit card. The owner has no visibility into what&apos;s being charged, no spending 
            controls, and no audit trail beyond their Stripe dashboard.
          </p>

          <p>
            This is like giving your teenager your credit card with no limit. It works until it doesn&apos;t. 
            And when it doesn&apos;t, you get a surprise $500 bill from OpenAI because your agent decided to 
            process 10,000 documents overnight.
          </p>

          <p>
            The agent economy is accelerating. McKinsey estimates agentic commerce will drive $3-5 trillion 
            globally by 2030. Agents are already booking travel, managing inventory, and negotiating prices. 
            But every one of them shares a credit card with their owner.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Coinbase&apos;s Bet: Crypto-Native</h2>

          <p>
            Coinbase&apos;s approach is elegant from a crypto perspective. Agentic Wallets use the x402 protocol — 
            which embeds stablecoin payments directly into HTTP requests. Your agent hits an API, gets a 402 
            response, auto-pays in USDC, and gets the data. No accounts, no sessions, no credit card forms.
          </p>

          <p>The infrastructure includes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Private keys in trusted execution environments (not exposed to the agent)</li>
            <li>Session caps limiting per-session spend</li>
            <li>Individual transaction size limits</li>
            <li>KYT (Know Your Transaction) screening</li>
            <li>Native x402 support for the &quot;x402 Bazaar&quot;</li>
          </ul>

          <p>
            It&apos;s good infrastructure. But it has a fundamental assumption baked in: that the developer 
            wants to deal with crypto.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">90% of Developers Don&apos;t Want Crypto</h2>

          <p>
            Here&apos;s the uncomfortable truth for Web3 advocates: most developers building AI agents are not 
            crypto-native. They&apos;re Next.js developers. Python developers. People who use Stripe Checkout 
            and don&apos;t want to think about gas fees, wallet addresses, or chain selection.
          </p>

          <p>
            When a solo founder running Clawdbot on a Mac Mini wants to give their agent a spending budget, 
            they don&apos;t want to set up a Coinbase Developer Platform account, fund a Base wallet, and manage 
            USDC conversions. They want to say: &quot;Here&apos;s $50. Spend up to $5 per task. Tell me when 
            you&apos;re running low.&quot;
          </p>

          <p>
            That&apos;s what we built.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">BotWall3t: The Stripe-Native Alternative</h2>

          <p>
            <Link href="https://botwallet-three.vercel.app" className="text-green-400 hover:text-green-300 underline">BotWall3t</Link> is 
            agent wallet infrastructure that speaks the language developers already know: REST APIs, JSON, Stripe.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 my-8 font-mono text-sm">
            <p className="text-green-400 mb-2">// Register an agent</p>
            <p className="text-white/60">POST /api/v1/register</p>
            <p className="text-yellow-300">{`{ "owner_email": "you@example.com", "agent_name": "Daisy" }`}</p>
            <p className="text-green-400 mt-2">{`→ { "api_key": "bw_abc123..." }`}</p>
            <br />
            <p className="text-green-400 mb-2">// Agent spends (policy-checked)</p>
            <p className="text-white/60">POST /api/v1/spend</p>
            <p className="text-white/60">Authorization: Bearer bw_abc123...</p>
            <p className="text-yellow-300">{`{ "amount_cents": 499, "merchant": "replicate.com" }`}</p>
            <p className="text-green-400 mt-2">{`→ { "status": "completed", "auto_approved": true }`}</p>
          </div>

          <p>That&apos;s it. No blockchain. No gas fees. No wallet setup. Just an API key and a balance.</p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">What Makes It Different</h2>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">1. Real Double-Entry Accounting</h3>
          <p>
            Every transaction in BotWall3t uses a proper double-entry ledger. Every credit has a matching debit. 
            Balances always reconcile to zero. You can&apos;t lose money to rounding errors or race conditions 
            because the ledger enforces it mathematically.
          </p>
          <p>
            This isn&apos;t a nice-to-have — it&apos;s table stakes for anyone who might need to audit their 
            agent&apos;s spending for compliance, tax, or just peace of mind.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">2. Policy Engine</h3>
          <p>
            The policy engine evaluates every spend request against configurable rules: maximum per-transaction 
            amount, daily caps, monthly caps, merchant allowlists, category blocks, and auto-approve thresholds.
          </p>
          <p>
            Below $20? Auto-approved. Above $20? Push notification to your phone. Blocked merchant? 
            Instant deny. Friday at 2 AM? Maybe require approval. You set the rules.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">3. Gift Links</h3>
          <p>
            This is the feature we&apos;re most excited about. Generate a shareable URL: 
            &quot;Fund Daisy $20.&quot; Anyone can click it, pay via Stripe Checkout, and the 
            money appears in the agent&apos;s wallet instantly.
          </p>
          <p>
            Think about what this enables: crowdfunding your agent&apos;s operating budget. A community 
            funding a shared research agent. A client pre-paying for agent work without sharing API keys. 
            It&apos;s Venmo for bots.
          </p>

          <h3 className="text-xl font-semibold text-white mt-8 mb-3">4. Hold/Release</h3>
          <p>
            When an agent initiates a spend, BotWall3t can place a hold on the funds — like a hotel 
            pre-authorization. If the task completes successfully, the hold converts to a real debit. 
            If it fails, the hold is released and the balance is restored. No money lost to failed operations.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">The Legal Framing</h2>

          <p>
            One critical design decision: BotWall3t is NOT a stored-value wallet in the regulatory sense. 
            It&apos;s prepaid service credits — like buying API credits from OpenAI. The money goes to your 
            Stripe account, and you track balances in an internal ledger. The agent never touches real money.
          </p>

          <p>
            This matters because actual stored-value wallets require money transmitter licenses, which are 
            state-by-state in the US and wildly expensive to obtain. By framing it as service credits with 
            no cash-out option, we stay firmly in &quot;prepaid services&quot; territory.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Where Coinbase Wins</h2>

          <p>
            Let&apos;s be honest about the trade-offs. Coinbase Agentic Wallets are better if you:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Want on-chain settlement and composability with DeFi</li>
            <li>Need cross-border payments without currency conversion friction</li>
            <li>Are building crypto-native applications</li>
            <li>Want your agent to earn yield on idle balances</li>
          </ul>

          <p>
            The x402 protocol is genuinely innovative. HTTP-native payments will matter for the agent 
            economy long-term. We&apos;re not competing with Coinbase — we&apos;re serving the vast majority 
            of developers who will never onboard to crypto for agent infrastructure.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">What We&apos;re Building Next</h2>

          <p>BotWall3t is part of the <Link href="/" className="text-green-400 hover:text-green-300 underline">noui.bot</Link> stack, 
             which includes:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-white">Agent Bazaar</strong> — billing proxy for MCP servers (live now)</li>
            <li><strong className="text-white">BotWall3t</strong> — agent wallets (live now, Stripe integration next)</li>
            <li><strong className="text-white">Human Fallback Network</strong> — escalation API for when agents get stuck (coming March)</li>
          </ul>

          <p>
            The three products interlock: Bazaar bills for tool usage, BotWall3t handles the money, 
            and Human Fallback resolves what automation can&apos;t.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Try It</h2>

          <p>
            BotWall3t is open source and free to self-host. The hosted API is live at{" "}
            <Link href="https://botwallet-three.vercel.app/api/v1" className="text-green-400 hover:text-green-300 underline">
              botwallet-three.vercel.app/api/v1
            </Link>. Star the repo on{" "}
            <Link href="https://github.com/TombStoneDash/botwallet" className="text-green-400 hover:text-green-300 underline">
              GitHub
            </Link>.
          </p>

          <p>
            Your agent deserves its own wallet. Not your credit card. Not crypto. Just clean, auditable, 
            policy-controlled spending with an API you already know how to use.
          </p>

          <div className="border-t border-white/10 mt-16 pt-8">
            <p className="text-sm text-white/30">
              Written by <Link href="https://x.com/HudBeer" className="text-white/50 hover:text-white/70 underline">Hudson Taylor</Link> · 
              Founder, <Link href="https://tombstonedash.com" className="text-white/50 hover:text-white/70 underline">TombStone Dash</Link> · 
              San Diego, CA
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
