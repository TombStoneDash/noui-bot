import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | noui.bot",
  description: "Privacy Policy for Agent Bazaar and noui.bot platform.",
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
      <h2 className="font-mono text-sm font-medium text-white mb-3">{title}</h2>
      <div className="text-sm text-white/50 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Privacy Policy
      </h1>
      <p className="text-white/40 font-mono text-sm mb-16">
        Effective: April 13, 2026 &middot; Tombstone Dash LLC
      </p>

      <div className="space-y-12">
        <Section title="1. Who We Are">
          <p>
            Agent Bazaar is operated by Tombstone Dash LLC, based in San Diego, California.
            This policy explains how we collect, use, and protect your information when
            you use our billing and metering infrastructure for MCP tools.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>
            <strong className="text-white/70">Account information:</strong> name, email
            address, and API key hash when you register as a provider or consumer.
          </p>
          <p>
            <strong className="text-white/70">Usage data:</strong> tool name, call timestamp,
            latency, cost, status (success/error), request and response sizes. We do not
            store the content of tool call requests or responses.
          </p>
          <p>
            <strong className="text-white/70">Payment information:</strong> handled entirely
            by Stripe. We store your Stripe customer ID or connected account ID but never
            credit card numbers, bank accounts, or other payment credentials.
          </p>
          <p>
            <strong className="text-white/70">Waitlist signups:</strong> email address only.
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-none space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>Process billing and payouts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>Provide usage analytics on your dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>Enforce rate limits and prevent abuse</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>Calculate provider trust scores and SLA metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>Resolve billing disputes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>Send platform announcements (if opted in)</span>
            </li>
          </ul>
        </Section>

        <Section title="4. Information We Don&apos;t Collect">
          <ul className="list-none space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-red-400/60">&times;</span>
              <span>Tool call request or response bodies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400/60">&times;</span>
              <span>Plaintext API keys</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400/60">&times;</span>
              <span>Cookies or tracking pixels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400/60">&times;</span>
              <span>Device fingerprints or IP addresses of end users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400/60">&times;</span>
              <span>Third-party advertising data</span>
            </li>
          </ul>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do not sell your personal information. We share data only with:</p>
          <ul className="list-none space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/70">Stripe:</strong> for payment processing
                and Stripe Connect payouts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/70">Vercel:</strong> for hosting and analytics
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/30">&rarr;</span>
              <span>
                <strong className="text-white/70">Supabase:</strong> for database hosting
                (PostgreSQL)
              </span>
            </li>
          </ul>
          <p>
            We may disclose information if required by law or to protect our rights.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            Account data is retained while your account is active. Usage logs are
            retained for 90 days for billing and analytics, then aggregated into
            daily summaries. Aggregated data does not contain personally identifiable
            information.
          </p>
          <p>
            You can request deletion of your account and associated data by emailing{" "}
            <a
              href="mailto:privacy@noui.bot"
              className="text-emerald-400/70 hover:text-emerald-300"
            >
              privacy@noui.bot
            </a>
            . We will process deletion requests within 30 days.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We protect your data with TLS encryption in transit, SHA-256 hashed
            API keys, and access controls on our database. See our{" "}
            <a href="/security" className="text-emerald-400/70 hover:text-emerald-300">
              Security page
            </a>{" "}
            for full details.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>
            California residents have rights under the CCPA to access, delete, and
            opt out of the sale of personal information (we do not sell personal
            information). To exercise these rights, email{" "}
            <a
              href="mailto:privacy@noui.bot"
              className="text-emerald-400/70 hover:text-emerald-300"
            >
              privacy@noui.bot
            </a>
            .
          </p>
        </Section>

        <Section title="9. Changes">
          <p>
            We may update this policy with 30 days notice via email or changelog.
            The &quot;Effective&quot; date at the top will be updated accordingly.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about privacy? Email{" "}
            <a
              href="mailto:privacy@noui.bot"
              className="text-emerald-400/70 hover:text-emerald-300"
            >
              privacy@noui.bot
            </a>{" "}
            or write to: Tombstone Dash LLC, San Diego, CA.
          </p>
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
