import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));

async function transpile(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const checkoutSource = await transpile("../src/app/api/bazaar/checkout/route.ts");
const connectSource = await transpile("../src/app/api/bazaar/connect/route.ts");

// Stripe fakes ignore idempotency keys on purpose, so these tests prove the
// database-side conditional link converges even without them.
// One-row table supporting the select/update chains the routes use.
// `column` is the Stripe link column; reads yield to the event loop so
// concurrent requests interleave like separate database round trips.
function fakeTable(row, column) {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
  return {
    select() {
      return { eq: () => ({ single: async () => { await tick(); return { data: { [column]: row[column] }, error: null }; } }) };
    },
    update(patch) {
      const filters = [];
      const chain = {
        eq(c, v) { filters.push((r) => r[c] === v); return chain; },
        is(c, v) { filters.push((r) => r[c] === v); return chain; },
        async select() {
          await tick();
          if (!filters.every((f) => f(row))) return { data: [], error: null };
          Object.assign(row, patch);
          return { data: [{ [column]: row[column] }], error: null };
        },
      };
      return chain;
    },
  };
}

function fakeStripe() {
  const calls = { customers: [], accounts: [], sessions: [], links: [] };
  let n = 0;
  return {
    calls,
    customers: { async create(params, opts) { calls.customers.push(opts); return { id: `cus_${++n}` }; } },
    accounts: { async create(params, opts) { calls.accounts.push(opts); return { id: `acct_${++n}` }; } },
    accountLinks: {
      async create(params) {
        calls.links.push(params);
        return { url: "https://connect.stripe.test/onboard", expires_at: 1_900_000_000 };
      },
    },
    checkout: {
      sessions: { async create(params) { calls.sessions.push(params); return { url: "https://checkout.stripe.test/s" }; } },
    },
  };
}

function load(source, { owner, row, table, column }) {
  const stripe = fakeStripe();
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    URL,
    console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/stripe") return { getStripe: () => stripe, STRIPE_PRO_PRICE_ID: "price_pro" };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => owner };
      if (name === "@/lib/supabase") return {
        getSupabase: () => ({ from(t) { assert.equal(t, table); return fakeTable(row, column); } }),
      };
      if (name === "@/lib/subscription") return {
        PLANS: {
          pro: { priceCents: 2900, callsPerMonth: 100000, feeRate: "5%" },
          scale: { priceCents: 9900, callsPerMonth: 1000000, feeRate: "3%" },
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { exports, stripe, row };
}

function req(url, body) {
  return new Request(url, {
    method: "POST",
    headers: { authorization: "Bearer bz_x" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const CONSUMER = { id: "cons-1", type: "consumer", email: "c@example.com", name: "C" };
const PROVIDER = { id: "prov-1", type: "provider", email: "p@example.com", name: "P" };

function loadCheckout(owner = CONSUMER, row = { id: "cons-1", stripe_customer_id: null }) {
  return load(checkoutSource, { owner, row, table: "bazaar_consumers", column: "stripe_customer_id" });
}

function loadConnect(row = { id: "prov-1", stripe_account_id: null }) {
  return load(connectSource, { owner: PROVIDER, row, table: "bazaar_providers", column: "stripe_account_id" });
}

/* ── checkout ─────────────────────────────────────────── */

for (const [label, body] of [
  ["malformed JSON", "{oops"],
  ["null body", "null"],
  ["missing plan", {}],
  ["prototype key", { plan: "toString" }],
  ["__proto__", { plan: "__proto__" }],
  ["non-string plan", { plan: ["pro"] }],
]) {
  test(`checkout rejects ${label} with 400 and no Stripe call`, async () => {
    const { exports, stripe } = loadCheckout();
    const res = await exports.POST(req("https://noui.bot/api/bazaar/checkout", body));
    assert.equal(res.status, 400);
    assert.equal(stripe.calls.sessions.length + stripe.calls.customers.length, 0);
  });
}

test("concurrent first checkouts link one Stripe customer", async () => {
  const { exports, stripe, row } = loadCheckout();
  const responses = await Promise.all([1, 2, 3].map(() =>
    exports.POST(req("https://noui.bot/api/bazaar/checkout", { plan: "pro" }))));
  for (const res of responses) assert.equal(res.status, 200);
  for (const opts of stripe.calls.customers) assert.equal(opts.idempotencyKey, "bazaar-consumer-customer-cons-1");
  const customers = new Set(stripe.calls.sessions.map((s) => s.customer));
  assert.equal(customers.size, 1);
  assert.deepEqual([...customers], [row.stripe_customer_id]);
  assert.deepEqual({ ...stripe.calls.sessions[0].metadata }, { plan: "pro", consumer_id: "cons-1" });
});

test("an existing customer is reused, not replaced", async () => {
  const { exports, stripe, row } = loadCheckout(CONSUMER, { id: "cons-1", stripe_customer_id: "cus_existing" });
  await exports.POST(req("https://noui.bot/api/bazaar/checkout", { plan: "scale" }));
  assert.equal(stripe.calls.customers.length, 0);
  assert.equal(stripe.calls.sessions[0].customer, "cus_existing");
  assert.equal(row.stripe_customer_id, "cus_existing");
});

test("a provider key is never recorded as a consumer_id", async () => {
  const { exports, stripe } = loadCheckout(PROVIDER);
  const res = await exports.POST(req("https://noui.bot/api/bazaar/checkout", { plan: "pro" }));
  assert.equal(res.status, 200);
  assert.deepEqual({ ...stripe.calls.sessions[0].metadata }, { plan: "pro" });
  assert.equal(stripe.calls.customers.length, 0);
});

test("a Stripe failure is a JSON 502 without the raw Stripe message", async () => {
  const { exports, stripe } = loadCheckout();
  stripe.customers.create = async () => { throw new Error("secret-ish internal detail"); };
  const res = await exports.POST(req("https://noui.bot/api/bazaar/checkout", { plan: "pro" }));
  assert.equal(res.status, 502);
  assert.doesNotMatch(JSON.stringify(await res.json()), /internal detail/);
});

/* ── connect ──────────────────────────────────────────── */

test("concurrent first onboarding calls create and link one Connect account", async () => {
  const { exports, stripe, row } = loadConnect();
  const responses = await Promise.all([1, 2, 3].map(() =>
    exports.POST(req("https://noui.bot/api/bazaar/connect", {}))));
  const bodies = await Promise.all(responses.map((r) => r.json()));
  for (const opts of stripe.calls.accounts) assert.equal(opts.idempotencyKey, "bazaar-provider-connect-prov-1");
  assert.deepEqual(new Set(bodies.map((b) => b.stripe_account_id)), new Set([row.stripe_account_id]));
  assert.deepEqual(new Set(stripe.calls.links.map((l) => l.account)), new Set([row.stripe_account_id]));
  assert.equal(stripe.calls.links[0].return_url, "https://noui.bot/bazaar/connect/complete");
});

test("an existing Connect account is never replaced", async () => {
  const { exports, stripe, row } = loadConnect({ id: "prov-1", stripe_account_id: "acct_existing" });
  const res = await exports.POST(req("https://noui.bot/api/bazaar/connect", { return_url: "https://example.com/done" }));
  assert.equal((await res.json()).stripe_account_id, "acct_existing");
  assert.equal(stripe.calls.accounts.length, 0);
  assert.equal(row.stripe_account_id, "acct_existing");
  assert.equal(stripe.calls.links[0].return_url, "https://example.com/done");
});

for (const body of [
  { return_url: "javascript:alert(1)" },
  { return_url: "http://example.com/done" },
  { refresh_url: "not a url" },
  { refresh_url: 42 },
]) {
  test(`connect rejects ${JSON.stringify(body)} before creating a Stripe account`, async () => {
    const { exports, stripe, row } = loadConnect();
    const res = await exports.POST(req("https://noui.bot/api/bazaar/connect", body));
    assert.equal(res.status, 422);
    assert.equal(stripe.calls.accounts.length, 0);
    assert.equal(row.stripe_account_id, null);
  });
}

test("a Stripe failure during onboarding is a JSON 502", async () => {
  const { exports, stripe } = loadConnect();
  stripe.accounts.create = async () => { throw new Error("stripe down"); };
  const res = await exports.POST(req("https://noui.bot/api/bazaar/connect", {}));
  assert.equal(res.status, 502);
  assert.equal((await res.json()).code, "STRIPE_ERROR");
});
