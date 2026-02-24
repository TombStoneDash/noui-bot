import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "noui.bot",
  description: "Agent-first infrastructure. APIs designed for bots, not browsers.",
  metadataBase: new URL("https://noui.bot"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "noui.bot — Agent-First Infrastructure",
    description: "The internet wasn't built for agents. We're fixing that. Agent Bazaar: billing & metering for MCP tools. BotWall3t: wallets for AI agents.",
    url: "https://noui.bot",
    siteName: "noui.bot",
    type: "website",
    images: [
      {
        url: "/logo-512.png",
        width: 512,
        height: 512,
        alt: "noui.bot — NO UI logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "noui.bot — Agent-First Infrastructure",
    description: "The internet wasn't built for agents. We're fixing that. Agent Bazaar + BotWall3t + Human Fallback.",
    images: ["/logo-512.png"],
    creator: "@HudBeer",
  },
  keywords: ["agent infrastructure", "AI agents", "bot API", "agent-first", "MCP server", "agent billing", "agent bazaar", "agent wallet", "no UI", "agent commerce", "MCP monetization"],
  other: {
    "robots": "index, follow",
  },
  alternates: {
    canonical: "https://noui.bot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="api" href="/api/v1" type="application/json" />
        <link rel="openapi" href="/api/openapi.json" type="application/json" />
        <link rel="alternate" href="/.well-known/agents.json" type="application/json" title="Agent Discovery" />
      </head>
      <body className="bg-black text-white antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
