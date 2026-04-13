import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — API Keys & Data Handling | noui.bot",
  description:
    "How Agent Bazaar secures API keys, handles data, and protects provider and consumer information.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-mono text-xs text-white/40 tracking-wider uppercase mb-6">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-3">
        Security
      </h1>
      <p className="text-white/40 font-mono text-sm max-w-xl leading-relaxed mb-16">
        How we protect your API keys, data, and tool traffic.
      </p>

      <div className="space-y-16">
        <Section title="API Key Management">
          <div className="space-y-6">
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <h3 className="font-mono text-sm font-medium text-white mb-3">
                Key Generation &amp; Storage
              </h3>
              <ul className="space-y-3 text-sm text-white/50">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    Keys use the format <code className="text-white/70">bz_</code> + 64
                    cryptographically random hex characters (256 bits of entropy).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    Only the SHA-256 hash is stored in the database. The plaintext key is
                    shown once at registration and never stored.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    A <code className="text-white/70">key_prefix</code> (first 8 characters)
                    is stored for identification in logs and dashboards.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    Keys have scoped permissions: providers get{" "}
                    <code className="text-white/70">read, write, manage_tools</code>;
                    consumers get <code className="text-white/70">read, call_tools</code>.
                  </span>
                </li>
              </ul>
            </div>

            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <h3 className="font-mono text-sm font-medium text-white mb-3">
                Key Lifecycle
              </h3>
              <ul className="space-y-3 text-sm text-white/50">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    Keys can be set to expire via <code className="text-white/70">expires_at</code>.
                    Expired keys are rejected immediately.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    Keys can be revoked via <code className="text-white/70">revoked_at</code>.
                    Revocation is instant and irreversible.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    <code className="text-white/70">last_used_at</code> is tracked
                    on every authenticated request for audit purposes.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    To rotate a key, contact support. The old key is revoked immediately
                    when a new one is issued.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Data Handling">
          <div className="space-y-6">
            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <h3 className="font-mono text-sm font-medium text-white mb-3">
                What We Store
              </h3>
              <ul className="space-y-3 text-sm text-white/50">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    <strong className="text-white/70">Usage metadata:</strong> tool name, timestamp,
                    latency, cost, status, request/response size. Used for billing and analytics.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    <strong className="text-white/70">Request hash:</strong> A SHA-256 hash of the
                    request body for deduplication. The raw request body is not stored.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                  <span>
                    <strong className="text-white/70">Account data:</strong> name, email, API key hash,
                    Stripe account ID. Minimum viable for billing operations.
                  </span>
                </li>
              </ul>
            </div>

            <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
              <h3 className="font-mono text-sm font-medium text-white mb-3">
                What We Don&apos;t Store
              </h3>
              <ul className="space-y-3 text-sm text-white/50">
                <li className="flex items-start gap-3">
                  <span className="text-red-400/60 mt-0.5 shrink-0">&times;</span>
                  <span>Tool call request bodies or response bodies</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400/60 mt-0.5 shrink-0">&times;</span>
                  <span>Plaintext API keys (only SHA-256 hashes)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400/60 mt-0.5 shrink-0">&times;</span>
                  <span>Credit card numbers (handled entirely by Stripe)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400/60 mt-0.5 shrink-0">&times;</span>
                  <span>IP addresses or device fingerprints of end users</span>
                </li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Transport Security">
          <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  All API traffic is encrypted via TLS 1.2+ (HTTPS enforced).
                  HSTS headers with 1-year max-age.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Proxy calls to provider endpoints use HTTPS. HTTP-only provider
                  endpoints are rejected.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Security headers on all responses: X-Content-Type-Options,
                  X-Frame-Options (DENY), Strict-Transport-Security.
                </span>
              </li>
            </ul>
          </div>
        </Section>

        <Section title="Rate Limiting &amp; Abuse Prevention">
          <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Per-consumer rate limits enforced at the proxy layer (configurable per tier).
                  Default: 60 RPM (Free), 300 RPM (Pro), 1,000 RPM (Scale).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Per-IP rate limits on public endpoints (30 RPM) to prevent scraping.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  429 responses include <code className="text-white/70">Retry-After</code> header
                  and remaining limit count.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Balance checks before every paid call prevent overdraft abuse.
                </span>
              </li>
            </ul>
          </div>
        </Section>

        <Section title="Receipts &amp; Audit Trail">
          <div className="border border-white/[0.08] rounded-lg p-6 bg-white/[0.02]">
            <ul className="space-y-3 text-sm text-white/50">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Every metered call generates a signed receipt (HMAC-SHA256) that
                  both consumer and provider can verify independently.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Receipts are publicly verifiable at{" "}
                  <code className="text-white/70">/api/v1/bazaar/receipts/[id]</code> &mdash;
                  no authentication required to verify a receipt.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">&rarr;</span>
                <span>
                  Dispute resolution is available for any call within 30 days.
                  Both parties can submit evidence via the Disputes API.
                </span>
              </li>
            </ul>
          </div>
        </Section>

        <Section title="Reporting Vulnerabilities">
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-6">
            <p className="text-sm text-white/60 leading-relaxed">
              If you discover a security vulnerability, please email{" "}
              <a
                href="mailto:security@noui.bot"
                className="text-amber-400 hover:text-amber-300"
              >
                security@noui.bot
              </a>
              . We take all reports seriously and will respond within 48 hours.
              Please do not open public GitHub issues for security vulnerabilities.
            </p>
          </div>
        </Section>
      </div>

      <footer className="mt-24 pt-8 border-t border-white/10">
        <p className="font-mono text-xs text-white/20">
          Built by Tombstone Dash LLC &middot; San Diego, CA
        </p>
      </footer>
    </div>
  );
}
