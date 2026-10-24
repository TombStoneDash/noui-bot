import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));
const source = await readFile(new URL("../src/lib/bazaar-auth.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const KEY = "bz_" + "a".repeat(64);
const KEY_HASH = createHash("sha256").update(KEY).digest("hex");

/**
 * Supabase stand-in. `tables[name]` is the `{ data, error }` a
 * select()...maybeSingle() on that table resolves to.
 */
function fakeSupabase(tables) {
  return {
    from(table) {
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        is() { return chain; },
        async maybeSingle() {
          assert.ok(table in tables, `unexpected read of ${table}`);
          return tables[table];
        },
        async single() { throw new Error("single() reports a missing row as an error; use maybeSingle()"); },
        update() { return { eq: async () => ({ error: null }) }; },
      };
      return chain;
    },
  };
}

function load(tables) {
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    crypto,
    Date,
    require(name) {
      if (name === "crypto") return { createHash };
      if (name === "./supabase") return { getSupabase: () => fakeSupabase(tables) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function request(key = KEY) {
  return new Request("https://example.test/api/bazaar/usage", { headers: { authorization: `Bearer ${key}` } });
}

const keyRow = (extra = {}) => ({
  data: { id: "k1", key_hash: KEY_HASH, owner_type: "consumer", owner_id: "c1", rate_limit_rpm: null, ...extra },
  error: null,
});
const consumerRow = { data: { id: "c1", name: "Agent", email: "a@example.test", active: true, rate_limit_rpm: 30, balance_cents: 500 }, error: null };
const outage = { data: null, error: { message: "connection terminated" } };

test("a valid consumer key authenticates", async () => {
  const { authenticateKey } = load({ bazaar_api_keys: keyRow(), bazaar_consumers: consumerRow });
  const owner = await authenticateKey(request());
  assert.equal(owner.id, "c1");
  assert.equal(owner.type, "consumer");
  assert.equal(owner.balance_cents, 500);
});

test("an unknown key is null, not an error", async () => {
  const { authenticateKey } = load({ bazaar_api_keys: { data: null, error: null } });
  assert.equal(await authenticateKey(request()), null);
});

test("a key-store outage throws AuthLookupError instead of reading as an invalid key", async () => {
  const { authenticateKey } = load({ bazaar_api_keys: outage });
  await assert.rejects(authenticateKey(request()), (err) => {
    assert.equal(err.name, "AuthLookupError");
    assert.match(err.message, /API key lookup failed: connection terminated/);
    return true;
  });
});

test("an owner lookup outage throws for consumers and providers", async () => {
  const consumer = load({ bazaar_api_keys: keyRow(), bazaar_consumers: outage });
  await assert.rejects(consumer.authenticateKey(request()), /Consumer lookup failed/);

  const provider = load({ bazaar_api_keys: keyRow({ owner_type: "provider", owner_id: "p1" }), bazaar_providers: outage });
  await assert.rejects(provider.authenticateKey(request()), /Provider lookup failed/);
});

test("a missing or inactive owner is still null", async () => {
  const missing = load({ bazaar_api_keys: keyRow(), bazaar_consumers: { data: null, error: null } });
  assert.equal(await missing.authenticateKey(request()), null);

  const inactive = load({ bazaar_api_keys: keyRow(), bazaar_consumers: { data: { ...consumerRow.data, active: false }, error: null } });
  assert.equal(await inactive.authenticateKey(request()), null);
});

test("expired keys and keys with an unreadable expiry are rejected", async () => {
  for (const expires_at of [new Date(Date.now() - 1000).toISOString(), "not-a-date"]) {
    const { authenticateKey } = load({ bazaar_api_keys: keyRow({ expires_at }), bazaar_consumers: consumerRow });
    assert.equal(await authenticateKey(request()), null, `expires_at ${expires_at}`);
  }

  const future = load({ bazaar_api_keys: keyRow({ expires_at: new Date(Date.now() + 60_000).toISOString() }), bazaar_consumers: consumerRow });
  assert.equal((await future.authenticateKey(request())).id, "c1");
});

test("malformed authorization headers never reach the database", async () => {
  const { authenticateKey } = load({});
  assert.equal(await authenticateKey(new Request("https://example.test/")), null);
  assert.equal(await authenticateKey(request("sk_live_nope")), null);
});
