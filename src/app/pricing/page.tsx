"use client";

import { useState } from "react";

function PriceCalculator() {
  const [callsPerDay, setCallsPerDay] = useState(1000);
  const [pricePerCall, setPricePerCall] = useState(0.01);

  const monthlyGross = callsPerDay * 30 * pricePerCall;
  const platformFee = monthlyGross * 0.10;
  const providerEarnings = monthlyGross - platformFee;
  const yearlyEarnings = providerEarnings * 12;

  return (
    <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
      <h3 className="font-mono text-sm font-bold mb-6">Revenue Calculator</h3>

      <div className="space-y-6">
        <div>
          <label className="font-mono text-xs text-white/50 block mb-2">
            Calls per day
          </label>
          <input
            type="range"
            min={10}
            max={100000}
            step={10}
            value={callsPerDay}
            onChange={(e) => setCallsPerDay(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="font-mono text-sm text-white mt-1">
            {callsPerDay.toLocaleString()} calls/day
          </div>
        </div>

        <div>
          <label className="font-mono text-xs text-white/50 block mb-2">
            Price per call
          </label>
          <input
            type="range"
            min={0.001}
            max={1}
            step={0.001}
            value={pricePerCall}
            onChange={(e) => setPricePerCall(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="font-mono text-sm text-white mt-1">
            ${pricePerCall.toFixed(3)}/call
          </div>
        </div>

        <div className="h-px bg-white/10" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] text-white/30 uppercase">
              Monthly gross
            </div>
            <div className="font-mono text-lg text-white/60">
              ${monthlyGross.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-white/30 uppercase">
              Platform fee (10%)
            </div>
            <div className="font-mono text-lg text-white/40">
              -${platformFee.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-emerald-400/60 uppercase">
              Your monthly earnings
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-400">
              ${providerEarnings.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-white/30 uppercase">
              Annual projection
            </div>
            <div className="font-mono text-lg text-white">
              ${yearlyEarnings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  feature,
  bazaar,
  selfBuild,
  highlight,
}: {
  feature: string;
  bazaar: string;
  selfBuild: string;
  highlight?: boolean;
}) {
  return (
    <tr className={`border-b border-white/[0.04] ${highlight ? "bg-emerald-500/5" : ""}`}>
      <td className="py-3 pr-4 font-mono text-xs text-white/60">{feature}</td>
      <td className="py-3 px-4 font-mono text-xs text-white/80">{bazaar}</td>
      <td className="py-3 pl-4 font-mono text-xs text-white/40">{selfBuild}</td>
    </tr>
  );
}

export default function PricingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  async function handleCheckout(plan: string) {
    setCheckoutLoading(plan);
    setCheckoutError("");
    try {
      const res = await fetch("/api/bazaar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.message || "Checkout unavailable");
      }
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a href="/" className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors">
        ← noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">Pricing</h1>
      <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed mb-16">
        One model. Simple math. You set the price, keep 90%.
      </p>

      {/* Consumer Tiers */}
      <div className="mb-16">
        <h2 className="font-mono text-xs text-white/30 uppercase tracking-widest mb-8">
          For Agent Developers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
            <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-2">Free</div>
            <div className="font-mono text-3xl font-bold mb-1">$0</div>
            <div className="font-mono text-sm text-white/40 mb-6">forever</div>
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>100 calls/month across all providers</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>18% platform fee on paid tools</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Usage dashboard</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Signed receipts</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Community support</span></li>
            </ul>
            <a href="/developers/register" className="block mt-6 text-center font-mono text-sm border border-white/20 text-white/70 px-6 py-3 rounded hover:border-white/40 hover:text-white transition-colors">
              Get Started Free
            </a>
          </div>

          {/* Builder */}
          <div className="border border-emerald-500/30 rounded-lg p-6 bg-emerald-500/[0.03] relative">
            <div className="absolute -top-3 left-6 font-mono text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded">
              POPULAR
            </div>
            <div className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-wider mb-2">Builder</div>
            <div className="font-mono text-3xl font-bold text-emerald-400 mb-1">$29<span className="text-lg text-emerald-400/60">/mo</span></div>
            <div className="font-mono text-sm text-white/40 mb-6">for growing agents</div>
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>1,000 calls/month included</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>12% platform fee on paid tools</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Usage analytics dashboard</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Priority support</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>120 RPM rate limit</span></li>
            </ul>
            <button
              onClick={() => handleCheckout("builder")}
              disabled={checkoutLoading === "builder"}
              className="block w-full mt-6 text-center font-mono text-sm bg-emerald-500 text-black px-6 py-3 rounded hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {checkoutLoading === "builder" ? "Loading..." : "Subscribe"}
            </button>
          </div>

          {/* Scale */}
          <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
            <div className="font-mono text-[10px] text-white/30 uppercase tracking-wider mb-2">Scale</div>
            <div className="font-mono text-3xl font-bold mb-1">$99<span className="text-lg text-white/40">/mo</span></div>
            <div className="font-mono text-sm text-white/40 mb-6">for production workloads</div>
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>10,000 calls/month included</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>8% platform fee on paid tools</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Advanced analytics + exports</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Dedicated support</span></li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Custom billing arrangements</span></li>
            </ul>
            <button
              onClick={() => handleCheckout("scale")}
              disabled={checkoutLoading === "scale"}
              className="block w-full mt-6 text-center font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {checkoutLoading === "scale" ? "Loading..." : "Subscribe"}
            </button>
          </div>
        </div>
        {checkoutError && (
          <p className="font-mono text-xs text-red-400 mt-4">{checkoutError}</p>
        )}
      </div>

      {/* Provider Model */}
      <div className="mb-16">
        <h2 className="font-mono text-xs text-white/30 uppercase tracking-widest mb-8">
          For Providers
        </h2>
        <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02] max-w-lg">
          <div className="font-mono text-3xl font-bold mb-1">90%</div>
          <div className="font-mono text-sm text-white/40 mb-6">of every paid call — you keep the rest</div>
          <ul className="space-y-3 text-sm text-white/50">
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>You set the price per tool call</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Sub-cent pricing supported ($0.001+)</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Free tools cost you nothing</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>Payouts via Stripe Connect</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>No monthly minimums</span></li>
          </ul>
          <a href="/providers/register" className="inline-block mt-6 font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors">
            Register as Provider
          </a>
        </div>
      </div>

      {/* Calculator */}
      <div className="mb-16">
        <h2 className="font-mono text-lg font-bold mb-6">How much can you earn?</h2>
        <PriceCalculator />
      </div>

      {/* Build vs Buy */}
      <div className="mb-16">
        <h2 className="font-mono text-lg font-bold mb-6">Build vs. Bazaar</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left font-mono text-xs text-white/30 uppercase py-2 pr-4">Feature</th>
                <th className="text-left font-mono text-xs text-emerald-400/60 uppercase py-2 px-4">Agent Bazaar</th>
                <th className="text-left font-mono text-xs text-white/30 uppercase py-2 pl-4">Build Yourself</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow feature="Setup time" bazaar="5 minutes" selfBuild="2-4 weeks" highlight />
              <ComparisonRow feature="Stripe integration" bazaar="Included" selfBuild="3-5 days dev time" />
              <ComparisonRow feature="Sub-cent metering" bazaar="Built-in" selfBuild="Custom implementation" />
              <ComparisonRow feature="Rate limiting" bazaar="Per-consumer, configurable" selfBuild="DIY or third-party" />
              <ComparisonRow feature="Trust & verification" bazaar="HMAC receipts, SLA tracking" selfBuild="Build from scratch" highlight />
              <ComparisonRow feature="Dispute resolution" bazaar="Full workflow included" selfBuild="Manual / support tickets" />
              <ComparisonRow feature="Discovery" bazaar="Listed in marketplace" selfBuild="Market yourself" highlight />
              <ComparisonRow feature="Vendor lock-in" bazaar="Open billing spec (MIT)" selfBuild="Your own code" />
              <ComparisonRow feature="Maintenance" bazaar="We handle it" selfBuild="Your burden forever" />
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="font-mono text-lg font-bold mb-6">FAQ</h2>
        <div className="space-y-6">
          {[
            { q: "Why 10%?", a: "We handle billing, metering, rate limiting, trust scoring, dispute resolution, and marketplace discovery. We include exactly-once billing, built-in dispute resolution, and provider-side SLA enforcement — trust primitives that nobody else in the MCP ecosystem offers. Providers keep 90% of revenue." },
            { q: "What about free tools?", a: "Free tools are completely free for both providers and consumers. We believe free tools drive ecosystem growth. You can offer a free tier (e.g., 100 calls/month free) alongside paid usage." },
            { q: "Can I change my pricing?", a: "Yes. Update pricing anytime via API or dashboard. Changes apply to new calls immediately. Existing prepaid balances are honored at the rate they were charged." },
            { q: "How do payouts work?", a: "Providers connect Stripe via Stripe Connect during registration. Payouts are processed monthly for earnings above $10. Instant payouts available for verified providers." },
            { q: "Is there vendor lock-in?", a: "No. Our billing spec is MIT licensed. If you outgrow us, take the spec and implement it yourself. Your MCP server doesn't change — only the billing proxy layer." },
            { q: "What if a tool call fails?", a: "Failed calls aren't charged. Consumers can file disputes on any call via the Disputes API. We track SLA metrics (uptime, latency, error rates) for every provider." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-white/[0.04] pb-4">
              <h3 className="font-mono text-sm font-medium mb-2">{faq.q}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/[0.06] pt-8">
        <div className="flex items-center gap-4 flex-wrap">
          <a href="/providers/register" className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-white/90 transition-colors">
            Start Earning →
          </a>
          <a href="/marketplace" className="font-mono text-sm border border-white/20 text-white/60 px-6 py-3 rounded hover:border-white/40 hover:text-white transition-colors">
            Browse Marketplace
          </a>
          <a href="/specs/mcp-billing-v1" className="font-mono text-sm text-white/30 hover:text-white/50 transition-colors">
            Read the Spec →
          </a>
        </div>
      </div>
    </div>
  );
}
