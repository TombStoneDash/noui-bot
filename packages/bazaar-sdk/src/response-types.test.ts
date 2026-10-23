import test from "node:test";
import assert from "node:assert/strict";
import { Bazaar, type BalanceLoadResult, type ConnectOnboarding, type ProviderSummary, type UsageSummary } from "./index";

// Fixtures copy the JSON the app routes actually return, so a type that drifts
// from the wire shape fails `tsc` here rather than in a user's editor.

const usageSummary: UsageSummary = {
  owner: { id: "agent-1", type: "consumer", name: "Agent" },
  period: "30d",
  summary: {
    total_calls: 3, successful_calls: 2, error_rate: "33.3%",
    total_spend_cents: 15, total_spend: "$0.15",
    data_volume: { request_bytes: 10, response_bytes: 20, tokens_input: 0, tokens_output: 0 },
  },
  top_tools: [{ tool: "weather", calls: 3, spend_cents: 15, spend: "$0.15" }],
  calls_by_day: [{ date: "2026-10-23", calls: 3, spend_cents: 15, errors: 1 }],
};

const providerSummary: ProviderSummary = {
  provider: { id: "provider-1", name: "Weather Co" },
  period: "30d",
  platform_fee_rate: "10%",
  earnings: {
    gross_revenue_cents: 100, gross_revenue: "$1.00",
    platform_fee_cents: 10, platform_fee: "$0.10",
    net_earnings_cents: 90, net_earnings: "$0.90",
  },
  payout: { pending_balance_cents: 90, pending_balance: "$0.90", last_payout_date: null, last_payout_cents: null },
  by_tool: [{ tool: "weather", calls: 20, gross_cents: 100, platform_fee_cents: 10, net_cents: 90 }],
  by_week: [{ week_of: "2026-10-18", calls: 20, gross_cents: 100, net_cents: 90 }],
};

function clientReturning(body: unknown, urls: string[]) {
  return new Bazaar({
    apiKey: "bz_test",
    fetch: (async (url: string) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response;
    }) as typeof globalThis.fetch,
  });
}

test("usage.summary() exposes totals under summary, as the route returns them", async () => {
  const urls: string[] = [];
  const usage = await clientReturning(usageSummary, urls).usage.summary("30d");
  assert.equal(usage.summary.total_calls, 3);
  assert.equal(usage.summary.total_spend, "$0.15");
  // @ts-expect-error totals are not top-level fields
  assert.equal(usage.total_calls, undefined);
  assert.match(urls[0], /\/api\/v1\/bazaar\/usage\/summary\?period=30d$/);
});

test("provider.summary() exposes earnings under earnings", async () => {
  const { earnings, payout } = await clientReturning(providerSummary, []).provider.summary();
  assert.equal(earnings.net_earnings_cents, 90);
  assert.equal(payout.pending_balance_cents, 90);
});

test("connectStripe() returns onboarding_url, not url", async () => {
  const body: ConnectOnboarding = {
    provider_id: "provider-1", stripe_account_id: "acct_1",
    onboarding_url: "https://connect.stripe.com/setup/x", expires_at: "2026-10-23T20:00:00Z",
  };
  const result = await clientReturning(body, []).provider.connectStripe("https://example.test/done");
  assert.equal(result.onboarding_url, body.onboarding_url);
  // @ts-expect-error the route never returned `url`
  assert.equal(result.url, undefined);
});

test("balance.load() narrows on mode to reach checkout_url", async () => {
  const body: BalanceLoadResult = {
    mode: "live", checkout_url: "https://checkout.stripe.com/c/x", session_id: "cs_1",
    amount_cents: 1000, amount: "$10.00", message: "Complete payment at the checkout URL to fund your balance.",
  };
  const loaded = await clientReturning(body, []).balance.load(1000);
  assert.equal(loaded.mode, "live");
  if (loaded.mode === "live") assert.equal(loaded.checkout_url, body.checkout_url);
});
