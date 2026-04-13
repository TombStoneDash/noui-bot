import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Agent Bazaar | noui.bot",
  description: "Simple, transparent pricing for the Agent Bazaar. 10% platform fee on paid calls. Free tools are free for everyone.",
  openGraph: {
    title: "Agent Bazaar Pricing",
    description: "10% platform fee. You keep 90%. No monthly minimums.",
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
          "description": "100 calls/month, 10% platform fee, usage dashboard",
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "29",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "description": "10,000 calls/month, 8% platform fee, priority support",
        },
        {
          "@type": "Offer",
          "name": "Scale",
          "price": "99",
          "priceCurrency": "USD",
          "billingDuration": "P1M",
          "description": "100,000 calls/month, 5% platform fee, dedicated support",
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
