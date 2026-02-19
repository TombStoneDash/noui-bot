import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
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
  other: {
    "robots": "index, follow",
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
      </head>
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
