import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Bazaar — Browse MCP Tools | noui.bot",
  description:
    "Browse and discover MCP tools with per-call billing. Search, weather, code execution, data extraction — every tool metered and monitored.",
  openGraph: {
    title: "Agent Bazaar — Browse MCP Tools",
    description:
      "The marketplace where AI agents discover, call, and pay for MCP tools.",
    url: "https://noui.bot/marketplace",
  },
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
