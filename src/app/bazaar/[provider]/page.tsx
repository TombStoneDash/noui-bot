import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVIDERS, getProvider } from "../providers";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ provider: string }>;
}

export async function generateStaticParams() {
  return PROVIDERS.map((p) => ({ provider: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provider: slug } = await params;
  const provider = getProvider(slug);
  if (!provider) return { title: "Provider Not Found — Agent Bazaar" };

  return {
    title: `${provider.name} — Agent Bazaar | noui.bot`,
    description: provider.description,
  };
}

export default async function ProviderDetailPage({ params }: Props) {
  const { provider: slug } = await params;
  const provider = getProvider(slug);

  if (!provider) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="px-6 md:px-16 lg:px-24 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <Link
            href="/bazaar"
            className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            &larr; Bazaar
          </Link>
          <span className="text-white/10 font-mono text-xs">/</span>
          <span className="font-mono text-xs text-white/50">{provider.name}</span>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 md:px-16 lg:px-24 py-12 border-b border-white/[0.06]">
        <span className="font-mono text-xs text-emerald-400/60 uppercase tracking-wider">
          {provider.category}
        </span>
        <h1 className="font-mono text-3xl md:text-4xl font-bold mt-3 mb-4">
          {provider.name}
        </h1>
        <p className="text-white/50 font-mono text-sm max-w-2xl leading-relaxed">
          {provider.description}
        </p>
        <div className="flex items-center gap-4 mt-6">
          <a
            href={provider.github}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-white/40 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <span className="text-white/10">|</span>
          <span className="font-mono text-xs text-white/30">
            {provider.tools.length} tool{provider.tools.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="px-6 md:px-16 lg:px-24 py-12 max-w-4xl">
        {/* Installation */}
        <section className="mb-12">
          <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
            Install
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4">
            <code className="font-mono text-sm text-emerald-400">
              {provider.install}
            </code>
          </div>
        </section>

        {/* Tools */}
        <section className="mb-12">
          <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
            Available Tools
          </h2>
          <div className="space-y-2">
            {provider.tools.map((tool) => (
              <div
                key={tool}
                className="flex items-center justify-between py-3 px-4 bg-white/[0.02] border border-white/[0.06] rounded"
              >
                <code className="font-mono text-sm text-white/70">{tool}</code>
                <span className="font-mono text-[10px] text-emerald-400/50">
                  callable
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Usage Example */}
        <section className="mb-12">
          <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
            Usage Example
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-5 overflow-x-auto">
            <pre className="font-mono text-xs text-white/60 whitespace-pre-wrap">
              {provider.example}
            </pre>
          </div>
        </section>

        {/* Add to Agent */}
        <section className="mb-12">
          <h2 className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
            Connect via Bazaar
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-5 overflow-x-auto">
            <pre className="font-mono text-xs text-white/60 whitespace-pre-wrap">{`curl -X POST https://noui.bot/api/bazaar/connect \\
  -H "Authorization: Bearer bz_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"provider": "${provider.slug}"}'`}</pre>
          </div>
        </section>

        {/* CTA */}
        <div className="border border-white/[0.08] rounded-lg p-8 bg-white/[0.02] text-center">
          <h3 className="font-mono text-lg font-bold mb-2">Add to your agent</h3>
          <p className="font-mono text-xs text-white/40 mb-6">
            Connect {provider.name} to your agent through Bazaar. Metered, monitored, auditable.
          </p>
          <button
            className="font-mono text-sm bg-white/10 text-white/50 px-6 py-3 rounded border border-white/10 cursor-not-allowed"
            disabled
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-white/[0.06]">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </div>
    </div>
  );
}
