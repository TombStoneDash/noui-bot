import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | noui.bot",
  description: "Terms of Service for Agent Bazaar and noui.bot platform.",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-3xl">
      <a
        href="/"
        className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        &larr; noui.bot
      </a>

      <h1 className="font-mono text-3xl md:text-4xl font-bold mt-8 mb-2">
        Terms of Service
      </h1>
      <p className="text-white/40 font-mono text-sm mb-16">
        Effective: April 13, 2026 &middot; Tombstone Dash LLC
      </p>

      <div className="space-y-12">
        <Section title="1. Acceptance">
          <p>
            By accessing or using Agent Bazaar (&quot;the Service&quot;), operated by
            Tombstone Dash LLC (&quot;we&quot;, &quot;us&quot;), you agree to these Terms. If you
            do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. The Service">
          <p>
            Agent Bazaar provides billing, metering, and discovery infrastructure
            for MCP (Model Context Protocol) tool servers. We act as a proxy between
            consumers (agent developers) and providers (MCP tool operators).
          </p>
          <p>
            We do not control, endorse, or guarantee the quality, safety, or legality
            of tools offered by providers. Providers are independent operators.
          </p>
        </Section>

        <Section title="3. Accounts &amp; API Keys">
          <p>
            You must provide accurate information during registration. You are
            responsible for keeping your API key secure. Notify us immediately if
            you suspect unauthorized use.
          </p>
          <p>
            We may suspend or terminate accounts that violate these Terms, engage
            in fraudulent activity, or abuse the platform.
          </p>
        </Section>

        <Section title="4. Billing &amp; Payments">
          <p>
            <strong className="text-white/70">Consumers:</strong> Tool calls are billed
            at the per-call price set by the provider. Your prepaid balance is deducted
            in real-time. Failed calls are not charged.
          </p>
          <p>
            <strong className="text-white/70">Providers:</strong> You receive 90% of
            gross revenue from paid tool calls (95% on Scale tier). Payouts are processed
            monthly via Stripe Connect for balances above $10. Platform fees are non-refundable.
          </p>
          <p>
            <strong className="text-white/70">Subscriptions:</strong> Pro ($29/month)
            and Scale ($99/month) plans auto-renew. Cancel anytime &mdash; access continues
            through the billing period. No refunds for partial months.
          </p>
        </Section>

        <Section title="5. Provider Responsibilities">
          <p>
            Providers must ensure their MCP tools are functional, respond within
            reasonable latency, and do not violate applicable laws. Providers set
            their own pricing and are responsible for the accuracy of tool descriptions.
          </p>
          <p>
            Providers must not register tools that facilitate illegal activity,
            distribute malware, or violate third-party intellectual property.
          </p>
        </Section>

        <Section title="6. Consumer Responsibilities">
          <p>
            Consumers must not use tools for purposes that violate applicable laws,
            attempt to circumvent billing, or abuse rate limits. Automated tool
            calls must respect provider-indicated rate limits and fair use policies.
          </p>
        </Section>

        <Section title="7. Disputes">
          <p>
            Consumers may dispute any charge within 30 days via the Disputes API.
            We will mediate in good faith. If a dispute is resolved in the consumer&apos;s
            favor, the charge is refunded from the provider&apos;s balance.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. We are
            not liable for damages arising from tool call failures, provider downtime,
            data loss, or third-party actions. Our total liability is limited to the
            fees you paid us in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="9. Intellectual Property">
          <p>
            The MCP Billing Spec is MIT licensed. The Agent Bazaar platform, SDK,
            and branding are proprietary to Tombstone Dash LLC. Providers retain
            all rights to their tools and content.
          </p>
        </Section>

        <Section title="10. Changes">
          <p>
            We may update these Terms with 30 days notice via email or changelog.
            Continued use after the notice period constitutes acceptance.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms are governed by the laws of the State of California.
            Disputes will be resolved in the courts of San Diego County, California.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms? Email{" "}
            <a
              href="mailto:legal@noui.bot"
              className="text-emerald-400/70 hover:text-emerald-300"
            >
              legal@noui.bot
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
