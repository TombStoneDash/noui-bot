import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference — Swagger UI | noui.bot",
  description: "Interactive OpenAPI documentation for the noui.bot Agent Bazaar API.",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 md:px-16 lg:px-24 py-8">
        <a
          href="/"
          className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          &larr; noui.bot
        </a>
        <h1 className="font-mono text-2xl font-bold mt-6 mb-2">
          API Reference
        </h1>
        <p className="text-white/40 font-mono text-sm mb-6">
          Interactive documentation auto-generated from{" "}
          <a
            href="/api/openapi.json"
            className="text-emerald-400/70 hover:text-emerald-300"
          >
            /api/openapi.json
          </a>
        </p>
      </div>
      <div className="w-full" style={{ minHeight: "80vh" }}>
        <SwaggerEmbed />
      </div>
    </div>
  );
}

function SwaggerEmbed() {
  return (
    <iframe
      src={`https://petstore.swagger.io/?url=${encodeURIComponent("https://noui.bot/api/openapi.json")}`}
      title="Swagger UI"
      className="w-full border-0"
      style={{ minHeight: "80vh", background: "#1a1a1a" }}
    />
  );
}
