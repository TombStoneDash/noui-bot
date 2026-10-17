import test from "node:test";
import assert from "node:assert/strict";
import { Bazaar, BazaarError, type Receipt, type ReceiptLookup, type ReceiptVerification } from "./index";

type FetchCall = { url: string; init: RequestInit | undefined };

// Matches the stored-receipt GET route: nullable metadata, no verify_url,
// and a top-level algorithm rather than the POST route's checked object.
const storedReceipt: ReceiptLookup = {
  receipt: {
    receipt_id: "rcpt_0123456789abcdef", tool_id: "tool-1", tool_name: null,
    agent_id: "agent-1", provider_id: "provider-1", timestamp: "2026-10-16T00:00:00Z",
    duration_ms: null, cost_microcents: 0, status: "success",
    signature: "0".repeat(64), created_at: "2026-10-16T00:00:00Z",
  },
  verification: { valid: true, algorithm: "HMAC-SHA256", verified_at: "2026-10-16T00:00:01Z" },
};

test("receipt lookup uses its actual wire shape, encodes the ID and sends no credentials", async () => {
  const calls: FetchCall[] = [];
  const client = new Bazaar({
    apiKey: "test-key-must-not-be-sent",
    fetch: fakeFetch(calls, () => ({ ok: true, status: 200, json: storedReceipt })),
  });
  const result = await client.receipts.get("receipt/with?reserved#characters");
  assert.deepEqual(result, storedReceipt);
  assert.equal(result.verification.algorithm, "HMAC-SHA256");
  // @ts-expect-error Only POST /verify returns a checked object.
  assert.equal(result.verification.checked, undefined);
  assert.equal(calls[0].url, "https://noui.bot/api/v1/bazaar/receipts/receipt%2Fwith%3Freserved%23characters");
  assert.equal(calls[0].init?.method, "GET");
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, undefined);
});

test("public verification accepts a looked-up receipt without a verify_url", async () => {
  const calls: FetchCall[] = [];
  const receipt: Receipt = storedReceipt.receipt;
  const response: ReceiptVerification = {
    receipt,
    verification: {
      valid: true, reason: "ok", checked: { canonical: "fixture", algorithm: "HMAC-SHA256" },
      verified_at: "2026-10-16T00:00:01Z",
    },
  };
  const client = new Bazaar({
    apiKey: "test-key-must-not-be-sent",
    fetch: fakeFetch(calls, () => ({ ok: true, status: 200, json: response })),
  });
  const result = await client.receipts.verify(receipt);
  assert.deepEqual(result, response);
  assert.equal(result.verification.checked.algorithm, "HMAC-SHA256");
  // @ts-expect-error Only GET lookup returns the top-level algorithm.
  assert.equal(result.verification.algorithm, undefined);
  assert.equal(calls[0].url, "https://noui.bot/api/v1/verify");
  assert.equal(calls[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init?.body as string), { receipt });
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, undefined);
});

function fakeFetch(calls: FetchCall[], respond: (call: FetchCall) => { ok: boolean; status: number; json: unknown }) {
  return (async (url: string, init?: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    const res = respond(call);
    return {
      ok: res.ok,
      status: res.status,
      // Mirror the real Fetch Response contract: the client may read either
      // (it currently reads text() first, then JSON.parses it, so it can
      // still build a sensible error from a non-JSON body).
      json: async () => res.json,
      text: async () => JSON.stringify(res.json),
    } as Response;
  }) as typeof globalThis.fetch;
}

test("catalog.list() is unauthenticated and hits the public catalog path", async () => {
  const calls: FetchCall[] = [];
  const client = new Bazaar({
    apiKey: "bz_consumer_should_not_be_sent",
    fetch: fakeFetch(calls, () => ({ ok: true, status: 200, json: { tools: [], total: 0, timestamp: "2026-01-01" } })),
  });

  const result = await client.catalog.list();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://noui.bot/api/bazaar/catalog");
  assert.equal(calls[0].init?.method, "GET");
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, undefined, "public catalog listing must not leak the API key");
  assert.equal(result.total, 0);
});

test("tools.call() sends a Bearer token and the tool name/input as JSON", async () => {
  const calls: FetchCall[] = [];
  const client = new Bazaar({
    apiKey: "bz_consumer_abc123",
    baseUrl: "https://custom.example.com/",
    fetch: fakeFetch(calls, () => ({
      ok: true,
      status: 200,
      json: { result: { ok: true }, meta: { cost_cents: 5, latency_ms: 12, provider: "p1", remaining_balance_cents: 995, tool_name: "wallet.balance" } },
    })),
  });

  const result = await client.tools.call("wallet.balance", { wallet: "0xabc" });

  assert.equal(calls.length, 1);
  // baseUrl's trailing slash must be stripped, not doubled with the path's leading slash.
  assert.equal(calls[0].url, "https://custom.example.com/api/bazaar/proxy");
  assert.equal(calls[0].init?.method, "POST");
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer bz_consumer_abc123");
  assert.deepEqual(JSON.parse(calls[0].init?.body as string), { tool_name: "wallet.balance", input: { wallet: "0xabc" } });
  assert.equal(result.meta.cost_cents, 5);
});

test("a non-ok response throws BazaarError carrying the API's status/code/message", async () => {
  const client = new Bazaar({
    apiKey: "bz_consumer_abc123",
    fetch: fakeFetch([], () => ({
      ok: false,
      status: 402,
      json: { error: "insufficient balance", code: "INSUFFICIENT_BALANCE" },
    })),
  });

  await assert.rejects(
    () => client.balance.get(),
    (err: unknown) => {
      assert.ok(err instanceof BazaarError);
      const bazaarErr = err as BazaarError;
      assert.equal(bazaarErr.status, 402);
      assert.equal(bazaarErr.code, "INSUFFICIENT_BALANCE");
      assert.equal(bazaarErr.message, "insufficient balance");
      return true;
    },
  );
});

test("a thrown network error is wrapped as a BazaarError with code NETWORK_ERROR", async () => {
  const client = new Bazaar({
    apiKey: "bz_consumer_abc123",
    fetch: (async () => { throw new Error("getaddrinfo ENOTFOUND"); }) as typeof globalThis.fetch,
  });

  await assert.rejects(
    () => client.stats.get(),
    (err: unknown) => {
      assert.ok(err instanceof BazaarError);
      const bazaarErr = err as BazaarError;
      assert.equal(bazaarErr.code, "NETWORK_ERROR");
      assert.equal(bazaarErr.message, "getaddrinfo ENOTFOUND");
      return true;
    },
  );
});
