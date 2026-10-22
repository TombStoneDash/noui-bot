import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}

async function transpile(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    fileName: "route.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const webhookJs = await transpile("../src/app/api/webhooks/stripe/route.ts");
const payoutsJs = await transpile("../src/app/api/bazaar/payouts/route.ts");

function load(js, modules, env = {}) {
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      }
      if (name in modules) return modules[name];
      throw new Error(`Unexpected import: ${name}`);
    },
    process: { env },
    console: { error() {}, log() {} },
    Response,
    Date,
  });
  vm.runInContext(js, context);
  return context.exports;
}

// --- Stripe webhook -------------------------------------------------------

const forgedUpgrade = JSON.stringify({
  type: "checkout.session.completed",
  data: {
    object: {
      mode: "subscription",
      subscription: "sub_forged",
      customer: "cus_victim",
      metadata: { plan: "scale" },
      customer_details: { email: "victim@example.com" },
    },
  },
});

function webhook(env, constructEvent) {
  const writes = [];
  const sb = {
    from(table) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: async () => ({ data: [{ id: "c1" }] }),
        update(row) { writes.push({ table, row }); return builder; },
        then: (resolve) => resolve({ error: null }),
      };
      return builder;
    },
  };
  const stripe = { webhooks: { constructEvent } };
  const { POST } = load(
    webhookJs,
    { "@/lib/stripe": { getStripe: () => stripe }, "@/lib/supabase": { getSupabase: () => sb } },
    env
  );
  return { POST, writes };
}

const webhookRequest = () =>
  new Request("https://noui.bot/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=forged" },
    body: forgedUpgrade,
  });

test("webhook: unsigned event is refused when the signing secret is unset", async () => {
  const { POST, writes } = webhook({}, () => { throw new Error("should not verify"); });
  const response = await POST(webhookRequest());
  assert.equal(response.status, 503);
  assert.equal(writes.length, 0, "a forged upgrade must not reach the database");
});

test("webhook: bad signature is a 400 with no writes", async () => {
  const { POST, writes } = webhook({ STRIPE_WEBHOOK_SECRET: "whsec_test" }, () => {
    throw new Error("No signatures found matching the expected signature");
  });
  const response = await POST(webhookRequest());
  assert.equal(response.status, 400);
  assert.equal(writes.length, 0);
});

test("webhook: verified event is processed", async () => {
  const { POST, writes } = webhook({ STRIPE_WEBHOOK_SECRET: "whsec_test" }, (body, sig, secret) => {
    assert.equal(secret, "whsec_test");
    return JSON.parse(body);
  });
  const response = await POST(webhookRequest());
  assert.equal(response.status, 200);
  assert.equal(writes[0].row.subscription_plan, "scale");
});

// --- Payouts --------------------------------------------------------------

// In-memory provider row with compare-and-swap semantics on update().eq().eq().
function payoutsHarness({ balance, transfer, beforeClaim }) {
  const row = { id: "prov-1", payout_balance_cents: balance, stripe_account_id: "acct_1" };
  const payouts = [];
  const transfers = [];
  const sb = {
    from(table) {
      if (table === "bazaar_payouts") {
        return { insert: async (r) => { payouts.push(r); return { error: null }; } };
      }
      assert.equal(table, "bazaar_providers");
      let update = null;
      const filters = [];
      const builder = {
        select() {
          if (!update) return builder;
          return (async () => {
            await beforeClaim?.(row);
            beforeClaim = undefined;
            const match = filters.every(([c, v]) => row[c] === v);
            if (match) Object.assign(row, update);
            return { data: match ? [{ id: row.id }] : [], error: null };
          })();
        },
        update(r) { update = r; return builder; },
        eq(c, v) { filters.push([c, v]); return builder; },
        single: async () => ({ data: { ...row }, error: null }),
      };
      return builder;
    },
  };
  const stripe = {
    transfers: {
      create: async (args) => {
        transfers.push(args);
        return transfer(args);
      },
    },
  };
  const { POST } = load(payoutsJs, {
    "@/lib/supabase": { getSupabase: () => sb },
    "@/lib/bazaar-auth": { authenticateKey: async () => ({ id: "prov-1", type: "provider", name: "P" }) },
    "@/lib/stripe": { getStripe: () => stripe, PLATFORM_FEE_RATE: 0.1 },
  });
  return { POST, row, payouts, transfers };
}

const payoutRequest = () => new Request("https://noui.bot/api/bazaar/payouts", { method: "POST" });

test("payout: transfers the balance once and zeroes it", async () => {
  const h = payoutsHarness({ balance: 5000, transfer: async () => ({ id: "tr_1" }) });
  const response = await h.POST(payoutRequest());
  assert.equal(response.status, 200);
  assert.equal(h.transfers.length, 1);
  assert.equal(h.transfers[0].amount, 5000);
  assert.equal(h.row.payout_balance_cents, 0);
  assert.equal(h.payouts[0].stripe_transfer_id, "tr_1");
});

test("payout: a concurrent payout that already claimed the balance gets 409 and no transfer", async () => {
  const h = payoutsHarness({
    balance: 5000,
    transfer: async () => ({ id: "tr_dup" }),
    // Another request zeroes the balance between our read and our claim.
    beforeClaim: (row) => { row.payout_balance_cents = 0; },
  });
  const response = await h.POST(payoutRequest());
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "PAYOUT_IN_PROGRESS");
  assert.equal(h.transfers.length, 0, "the same earnings must not be transferred twice");
});

test("payout: a failed transfer gives the claimed balance back", async () => {
  const h = payoutsHarness({
    balance: 5000,
    transfer: async () => { throw new Error("Insufficient platform funds"); },
  });
  const response = await h.POST(payoutRequest());
  assert.equal(response.status, 500);
  assert.equal(h.row.payout_balance_cents, 5000);
  assert.equal(h.payouts.length, 0);
});
