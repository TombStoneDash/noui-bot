import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import * as subscription from "../src/lib/subscription.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const CONSUMER = "11111111-1111-4111-8111-111111111111";

// Fake Supabase that records every write and answers each table/op from `answers`.
function fakeSupabase(answers = {}) {
  const writes = [];
  const builder = (table, op, payload) => {
    const rec = { table, op, payload, filters: [] };
    if (op !== "select") writes.push(rec);
    const resolve = () => Promise.resolve(answers[`${table}.${op}`]?.(rec) ?? { data: null, error: null });
    const b = {
      eq(c, v) { rec.filters.push([c, v]); return b; },
      select() { return b; },
      single: resolve,
      then(f, r) { return resolve().then(f, r); },
    };
    return b;
  };
  return {
    writes,
    from(table) {
      return {
        select: (cols) => builder(table, "select", cols),
        insert: (row) => builder(table, "insert", row),
        delete: () => builder(table, "delete"),
      };
    },
  };
}

async function loadRoute(path, { sb, owner = null }) {
  const source = await readFile(new URL(`../src/app/api/bazaar/${path}/route.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Object, Date,
    console: { log() {}, error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/subscription") return subscription;
      if (name === "@/lib/bazaar-auth") return {
        authenticateKey: async () => owner,
        generateBazaarKey: () => ({ key: "bz_test", hash: "hash", prefix: "bz_te" }),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: `${path}/route.js` });
  return exports;
}

async function register(sb, body) {
  const { POST } = await loadRoute("register-consumer", { sb });
  const response = await POST(new Request("https://noui.bot/api/bazaar/register-consumer", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() };
}

const inserted = { "bazaar_consumers.insert": (rec) => ({ data: { id: CONSUMER, ...rec.payload }, error: null }) };

test("register-consumer: a non-object body is a 400, not a crash", async () => {
  for (const body of [null, [], "Agent", 42]) {
    const sb = fakeSupabase(inserted);
    const r = await register(sb, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.body.code, "BAD_REQUEST");
    assert.equal(sb.writes.length, 0);
  }
});

test("register-consumer: non-string name or email is a 422, not a 500", async () => {
  for (const body of [
    { name: 42, email: "a@example.test" },
    { name: "Agent", email: 42 },
    { name: ["Agent"], email: "a@example.test" },
    { name: { trim: "x" }, email: "a@example.test" },
    { name: "Agent", email: null },
    { name: "   ", email: "a@example.test" },
  ]) {
    const sb = fakeSupabase(inserted);
    const r = await register(sb, body);
    assert.equal(r.status, 422, JSON.stringify(body));
    assert.equal(r.body.code, "VALIDATION_ERROR");
    assert.equal(sb.writes.length, 0);
  }
});

test("register-consumer: malformed emails and oversized names are refused", async () => {
  for (const body of [
    { name: "Agent", email: "not-an-email" },
    { name: "Agent", email: "a@b" },
    { name: "Agent", email: "a b@example.test" },
    { name: "Agent", email: `${"a".repeat(250)}@example.test` },
    { name: "A".repeat(201), email: "a@example.test" },
  ]) {
    const sb = fakeSupabase(inserted);
    const r = await register(sb, body);
    assert.equal(r.status, 422, JSON.stringify(body).slice(0, 80));
    assert.equal(sb.writes.length, 0);
  }
});

test("register-consumer: valid input is trimmed and registered", async () => {
  const sb = fakeSupabase(inserted);
  const r = await register(sb, { name: "  Agent  ", email: " Dev.Team+bot@Example.test " });
  assert.equal(r.status, 201);
  assert.equal(r.body.api_key, "bz_test");
  assert.deepEqual(
    [sb.writes[0].payload.name, sb.writes[0].payload.email],
    ["Agent", "Dev.Team+bot@Example.test"],
  );
});

test("register-consumer: a database error is not echoed to the caller", async () => {
  const sb = fakeSupabase({
    "bazaar_consumers.insert": () => ({ data: null, error: { message: 'duplicate key value violates unique constraint "bazaar_consumers_email_key"' } }),
  });
  const r = await register(sb, { name: "Agent", email: "a@example.test" });
  assert.equal(r.status, 500);
  assert.equal(r.body.message, "Consumer could not be registered");
  assert.doesNotMatch(JSON.stringify(r.body), /constraint|bazaar_consumers/);
});

test("register-consumer: a failed key insert removes the keyless consumer row", async () => {
  const sb = fakeSupabase({ ...inserted, "bazaar_api_keys.insert": () => ({ error: { message: "duplicate key" } }) });
  const r = await register(sb, { name: "Agent", email: "a@example.test" });
  assert.equal(r.status, 500);
  assert.equal(r.body.api_key, undefined);
  const cleanup = sb.writes.find((w) => w.table === "bazaar_consumers" && w.op === "delete");
  assert.ok(cleanup, "consumer row is deleted");
  assert.deepEqual(cleanup.filters, [["id", CONSUMER]]);
});

async function getSubscription(row) {
  const sb = fakeSupabase({ "bazaar_consumers.select": () => row });
  const { GET } = await loadRoute("subscription", { sb, owner: { id: CONSUMER, type: "consumer" } });
  const response = await GET(new Request("https://noui.bot/api/bazaar/subscription"));
  return { status: response.status, body: await response.json() };
}

test("subscription: a failed lookup is a 503, never reported as the free plan", async () => {
  for (const row of [{ data: null, error: { message: "connection reset" } }, { data: null, error: null }]) {
    const r = await getSubscription(row);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, true);
    assert.equal(r.body.plan, undefined);
  }
});

test("subscription: a paid plan reports its own details and features", async () => {
  const r = await getSubscription({
    data: { subscription_id: "sub_1", subscription_plan: "pro", subscription_status: "active", rate_limit_rpm: 300 },
    error: null,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.plan, "pro");
  assert.equal(r.body.plan_details.name, "Pro");
  assert.equal(r.body.features.custom_domains, true);
  assert.equal(r.body.agent_limit, null);
  assert.equal(r.body.rate_limit_rpm, 300);
});

test("subscription: an unknown plan name resolves to free everywhere in the response", async () => {
  for (const plan of ["enterprise", "constructor", null]) {
    const r = await getSubscription({ data: { subscription_plan: plan }, error: null });
    assert.equal(r.status, 200, String(plan));
    assert.equal(r.body.plan, "free");
    assert.equal(r.body.plan_details.name, "Free");
    assert.equal(r.body.features.unlimited_agents, false);
    assert.equal(r.body.agent_limit, 3);
  }
});
