import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Agent Bazaar | noui.bot",
  description: "Simple, transparent pricing for the Agent Bazaar. 18% platform fee on paid calls. Free tools are free for everyone.",
  openGraph: {
    title: "Agent Bazaar Pricing",
    description: "18% platform fee. You keep 82%. No monthly minimums.",
    url: "https://noui.bot/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
