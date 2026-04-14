import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free vs Pro | noui.bot",
  description: "Free: 3 agents, community support. Pro at $29/mo: unlimited agents, priority support, custom domains, advanced analytics.",
  openGraph: {
    title: "noui.bot Pricing — Free vs Pro",
    description: "Start free with 3 agents. Upgrade to Pro at $29/mo for unlimited agents, priority support, custom domains, and advanced analytics.",
    url: "https://noui.bot/pricing",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Agent Bazaar",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web",
      "url": "https://noui.bot",
      "description": "Billing, metering, and auth for MCP tool servers. Providers set per-call pricing, keep 90% of revenue.",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free",
          "price": "0",
          "priceCurrency": "USD",
          "description": "3 agents, community support, 100 calls/month, usage dashboard",
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "29",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "description": "Unlimited agents, priority support, custom domains, advanced analytics, 10,000 calls/month",
        },
      ],
    },
    {
      "@type": "Organization",
      "name": "Tombstone Dash LLC",
      "url": "https://noui.bot",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "San Diego",
        "addressRegion": "CA",
        "addressCountry": "US",
      },
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why 10%?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We handle billing, metering, rate limiting, trust scoring, dispute resolution, and marketplace discovery. Providers keep 90% of revenue.",
          },
        },
        {
          "@type": "Question",
          "name": "What about free tools?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Free tools are completely free for both providers and consumers. No fees on free tool calls.",
          },
        },
        {
          "@type": "Question",
          "name": "Can I change my pricing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Update pricing anytime via API or dashboard. Changes apply to new calls immediately.",
          },
        },
        {
          "@type": "Question",
          "name": "How do payouts work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Providers connect Stripe via Stripe Connect. Payouts are processed monthly for earnings above $10.",
          },
        },
        {
          "@type": "Question",
          "name": "Is there vendor lock-in?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. The billing spec is MIT licensed. If you outgrow us, take the spec and implement it yourself.",
          },
        },
      ],
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
