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

const source = await readFile(new URL("../src/app/api/webhooks/stripe/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

/**
 * In-memory bazaar_consumers. update().eq() applies to matching rows and
 * resolves { data, error }; select().eq().limit() returns matching ids.
 * `failOn` makes every operation of that kind return an error.
 */
function consumers(rows, { failOn = null } = {}) {
  const writes = [];
  return {
    rows,
    writes,
    from(table) {
      assert.equal(table, "bazaar_consumers");
      let op = "select";
      let patch = null;
      const filters = [];
      const matching = () => rows.filter((r) => filters.every(([c, v]) => r[c] === v));
      const run = () => {
        if (failOn === op) return { data: null, error: { message: `relation is locked (${op})` } };
        if (op === "update") {
          const hit = matching();
          for (const r of hit) Object.assign(r, patch);
          writes.push({ patch, filters: [...filters], matched: hit.length });
          return { data: hit.map((r) => ({ id: r.id })), error: null };
        }
        return { data: matching().map((r) => ({ id: r.id })), error: null };
      };
      const b = {
        select: () => b,
        update(p) { op = "update"; patch = p; return b; },
        eq(c, v) { filters.push([c, v]); return b; },
        limit: async (n) => { const out = run(); return out.data ? { ...out, data: out.data.slice(0, n) } : out; },
        then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
      };
      return b;
    },
  };
}

function route(sb) {
  const logs = [];
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      if (name === "@/lib/stripe") return { getStripe: () => ({ webhooks: { constructEvent: (body) => JSON.parse(body) } }) };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      throw new Error(`Unexpected import: ${name}`);
    },
    process: { env: { STRIPE_WEBHOOK_SECRET: "whsec_test" } },
    console: { error: (m) => logs.push(m), log() {} },
    Response,
    Date,
  });
  vm.runInContext(outputText, context);
  const send = async (event) => {
    const response = await context.exports.POST(new Request("https://noui.bot/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=sig" },
      body: JSON.stringify({ id: "evt_1", ...event }),
    }));
    return { status: response.status, json: await response.json() };
  };
  return { send, logs };
}

const checkout = (object) => ({
  type: "checkout.session.completed",
  data: { object: { id: "cs_1", mode: "subscription", subscription: "sub_1", customer: "cus_1", metadata: { plan: "pro" }, ...object } },
});

const subscriptionUpdated = (object) => ({
  type: "customer.subscription.updated",
  data: {
    object: {
      id: "sub_1",
      status: "active",
      items: { data: [{ price: { unit_amount: 9900 }, current_period_end: 1_800_000_000 }] },
      ...object,
    },
  },
});

test("checkout: the consumer id from our session metadata wins over email", async () => {
  const sb = consumers([
    { id: "c-buyer", email: "shared@example.com" },
    { id: "c-other", email: "shared@example.com" },
  ]);
  const { send } = route(sb);
  const out = await send(checkout({ metadata: { plan: "scale", consumer_id: "c-buyer" }, customer_details: { email: "shared@example.com" } }));
  assert.equal(out.status, 200);
  assert.equal(sb.rows[0].subscription_plan, "scale");
  assert.equal(sb.rows[0].stripe_customer_id, "cus_1");
  assert.equal(sb.rows[0].rate_limit_rpm, 1000);
  assert.equal(sb.rows[1].subscription_plan, undefined, "the other account is untouched");
});

test("checkout: falls back to the Stripe customer id", async () => {
  const sb = consumers([{ id: "c1", stripe_customer_id: "cus_1" }]);
  const out = await route(sb).send(checkout({}));
  assert.equal(out.status, 200);
  assert.equal(sb.rows[0].subscription_id, "sub_1");
  assert.equal(sb.rows[0].subscription_plan, "pro");
});

test("checkout: an email shared by several accounts upgrades none of them", async () => {
  const sb = consumers([
    { id: "c1", email: "shared@example.com" },
    { id: "c2", email: "shared@example.com" },
  ]);
  const { send, logs } = route(sb);
  const out = await send(checkout({ customer_details: { email: "shared@example.com" } }));
  assert.equal(out.status, 200);
  assert.equal(sb.writes.length, 0);
  assert.match(logs.join("\n"), /matched no single consumer/);
});

test("checkout: a unique email match links the customer and upgrades that account only", async () => {
  const sb = consumers([{ id: "c1", email: "solo@example.com" }, { id: "c2", email: "x@example.com" }]);
  const out = await route(sb).send(checkout({ customer_details: { email: "solo@example.com" } }));
  assert.equal(out.status, 200);
  assert.equal(sb.rows[0].stripe_customer_id, "cus_1");
  assert.deepEqual(sb.writes[0].filters, [["id", "c1"]]);
  assert.equal(sb.rows[1].subscription_plan, undefined);
});

for (const failOn of ["update", "select"]) {
  test(`checkout: a database ${failOn} error is a 500 so Stripe retries, without details`, async () => {
    const sb = consumers([{ id: "c1", stripe_customer_id: "cus_1" }], { failOn });
    const { send, logs } = route(sb);
    // update: fails on the consumer-id update; select: no consumer id, so the customer lookup fails.
    const metadata = failOn === "update" ? { plan: "pro", consumer_id: "c1" } : { plan: "pro" };
    const out = await send(checkout({ metadata }));
    assert.equal(out.status, 500);
    assert.doesNotMatch(JSON.stringify(out.json), /locked/);
    assert.match(logs.join("\n"), /evt_1/);
  });
}

test("subscription.updated: period end is read from the item (current API versions)", async () => {
  const sb = consumers([{ id: "c1", subscription_id: "sub_1", subscription_plan: "pro" }]);
  const out = await route(sb).send(subscriptionUpdated({}));
  assert.equal(out.status, 200);
  assert.equal(sb.rows[0].subscription_plan, "scale");
  assert.equal(sb.rows[0].rate_limit_rpm, 1000);
  assert.equal(sb.rows[0].subscription_current_period_end, new Date(1_800_000_000 * 1000).toISOString());
});

test("subscription.updated: legacy top-level current_period_end still works", async () => {
  const sb = consumers([{ id: "c1", subscription_id: "sub_1" }]);
  await route(sb).send(subscriptionUpdated({ items: { data: [{ price: { unit_amount: 2900 } }] }, current_period_end: 1_700_000_000 }));
  assert.equal(sb.rows[0].subscription_current_period_end, new Date(1_700_000_000 * 1000).toISOString());
});

test("subscription.updated: an unrecognised price keeps the paid plan and limit", async () => {
  const sb = consumers([{ id: "c1", subscription_id: "sub_1", subscription_plan: "pro", rate_limit_rpm: 300 }]);
  const { send, logs } = route(sb);
  const out = await send(subscriptionUpdated({ items: { data: [{ price: { unit_amount: 29000 } }] } }));
  assert.equal(out.status, 200);
  assert.equal(sb.rows[0].subscription_plan, "pro", "not downgraded to free");
  assert.equal(sb.rows[0].rate_limit_rpm, 300);
  assert.equal(sb.rows[0].subscription_status, "active");
  assert.match(logs.join("\n"), /unrecognised price 29000/);
});

test("subscription.updated: a past_due subscription drops to the free rate limit", async () => {
  const sb = consumers([{ id: "c1", subscription_id: "sub_1", rate_limit_rpm: 1000 }]);
  await route(sb).send(subscriptionUpdated({ status: "past_due" }));
  assert.equal(sb.rows[0].subscription_status, "past_due");
  assert.equal(sb.rows[0].rate_limit_rpm, 60);
});

test("subscription.updated / deleted: write errors are a 500", async () => {
  for (const event of [subscriptionUpdated({}), { type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } }]) {
    const out = await route(consumers([{ id: "c1", subscription_id: "sub_1" }], { failOn: "update" })).send(event);
    assert.equal(out.status, 500, event.type);
  }
});

test("subscription.deleted: returns the account to free", async () => {
  const sb = consumers([{ id: "c1", subscription_id: "sub_1", subscription_plan: "scale", rate_limit_rpm: 1000 }]);
  const out = await route(sb).send({ type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } });
  assert.equal(out.status, 200);
  assert.equal(sb.rows[0].subscription_plan, "free");
  assert.equal(sb.rows[0].rate_limit_rpm, 60);
});
