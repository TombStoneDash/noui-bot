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
  openGraph: {
    title: "noui.bot",
    description: "The internet wasn't built for agents. We're fixing that.",
    url: "https://noui.bot",
    siteName: "noui.bot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "noui.bot",
    description: "The internet wasn't built for agents. We're fixing that.",
  },
  keywords: ["agent infrastructure", "AI agents", "bot API", "agent-first", "deploy rail", "MCP server", "no UI", "agent commerce"],
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
