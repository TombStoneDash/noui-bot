import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Static provider data (will be replaced with DB lookup)
const providers: Record<
  string,
  {
    name: string;
    displayName: string;
    bio: string;
    location: string;
    github: string;
    verifiedHuman: boolean;
    tools: { name: string; description: string; pricePerCall: string }[];
    joinedDate: string;
    totalCalls: string;
    uptime: string;
  }
> = {
  tombstonedash: {
    name: "Hudson Taylor",
    displayName: "TombStone Dash",
    bio: "Biochemist, actor, builder. Created Agent Bazaar because MCP tool builders deserve to get paid. Also built ActorLab (13+ AI tools for actors) and TrashAlert (954K address lookup).",
    location: "San Diego, CA",
    github: "https://github.com/TombStoneDash",
    verifiedHuman: true,
    tools: [
      {
        name: "BotWall3t",
        description: "Agent wallet — spending controls, receipt logging, multi-provider billing",
        pricePerCall: "$0.001",
      },
      {
        name: "Deploy Rail",
        description: "One-command Vercel/Railway deploys from natural language",
        pricePerCall: "$0.01",
      },
      {
        name: "Sentinel MCP",
        description: "Security scanning and vulnerability detection for MCP servers",
        pricePerCall: "$0.005",
      },
    ],
    joinedDate: "February 2026",
    totalCalls: "0",
    uptime: "99.9%",
  },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const provider = providers[id];
  if (!provider) return { title: "Provider Not Found — Agent Bazaar" };
  return {
    title: `${provider.displayName} — Verified Human Provider | Agent Bazaar`,
    description: `${provider.name} — ${provider.bio.slice(0, 120)}`,
    openGraph: {
      title: `${provider.displayName} — Verified Human Provider`,
      description: provider.bio.slice(0, 160),
    },
  };
}

export default async function ProviderProfilePage({ params }: PageProps) {
  const { id } = await params;
  const provider = providers[id];
  if (!provider) notFound();

  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="font-mono text-xs text-white/30 mb-8">
        <a href="/marketplace" className="hover:text-green-400">
          marketplace
        </a>{" "}
        /{" "}
        <a href="/providers" className="hover:text-green-400">
          providers
        </a>{" "}
        / <span className="text-white/50">{id}</span>
      </div>

      {/* Provider Header */}
      <div className="bg-white/5 border border-white/10 p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-green-400/10 border border-green-400/30 flex items-center justify-center font-mono text-green-400 text-2xl">
              {provider.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-mono text-2xl text-white">
                {provider.displayName}
              </h1>
              {provider.verifiedHuman && (
                <span className="font-mono text-xs bg-green-400/10 text-green-400 border border-green-400/30 px-2 py-1">
                  ✓ VERIFIED HUMAN
                </span>
              )}
            </div>
            <p className="text-white/40 font-mono text-sm mb-3">
              {provider.name} · {provider.location} · Joined{" "}
              {provider.joinedDate}
            </p>
            <p className="text-white/70 leading-relaxed">{provider.bio}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
          {[
            { label: "Tools", value: String(provider.tools.length) },
            { label: "Total Calls", value: provider.totalCalls },
            { label: "Uptime", value: provider.uptime },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-xl text-green-400">
                {stat.value}
              </div>
              <div className="font-mono text-xs text-white/30">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <a
            href={provider.github}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-green-400 hover:underline"
          >
            {provider.github}
          </a>
        </div>
      </div>

      {/* Tools */}
      <div className="mb-8">
        <h2 className="font-mono text-green-400 text-xs tracking-widest uppercase mb-4">
          {`> tools (${provider.tools.length})`}
        </h2>
        <div className="space-y-3">
          {provider.tools.map((tool) => (
            <div
              key={tool.name}
              className="bg-white/5 border border-white/10 p-4 hover:border-green-400/20 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-mono text-white text-sm">{tool.name}</h3>
                  <p className="text-white/50 text-sm mt-1">
                    {tool.description}
                  </p>
                </div>
                <div className="font-mono text-green-400 text-sm whitespace-nowrap ml-4">
                  {tool.pricePerCall}/call
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Signals */}
      <div>
        <h2 className="font-mono text-green-400 text-xs tracking-widest uppercase mb-4">
          {"> trust_signals"}
        </h2>
        <div className="bg-white/5 border border-white/10 p-4">
          <div className="font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40">verified_human</span>
              <span className="text-green-400">
                {provider.verifiedHuman ? "true" : "false"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">github_linked</span>
              <span className="text-green-400">true</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">billing_spec</span>
              <span className="text-green-400">mcp-billing-v1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">signed_receipts</span>
              <span className="text-green-400">enabled</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">sla_monitored</span>
              <span className="text-green-400">true</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-white/10 text-center">
        <p className="font-mono text-white/20 text-xs">
          <a href="/humans" className="hover:text-green-400">
            humans.txt
          </a>{" "}
          — because trust starts with knowing who you&apos;re dealing with
        </p>
      </div>
    </main>
  );
}
