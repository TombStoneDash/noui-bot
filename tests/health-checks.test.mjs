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
const source = await readFile(new URL("../src/lib/health-checks.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

/**
 * Load health-checks with a fake Neon `sql` tag and a fake Supabase client.
 * `supabaseQuery` is what awaiting from().select().limit() resolves to.
 */
function load({ sql = async () => [{ "?column?": 1 }], getSupabase, supabaseQuery } = {}) {
  const timers = { set: 0, cleared: 0 };
  const queries = [];
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Promise,
    Error,
    Date,
    console: { error() {} },
    setTimeout(fn, ms) { timers.set++; return setTimeout(fn, ms); },
    clearTimeout(id) { if (id !== undefined) timers.cleared++; clearTimeout(id); },
    require(name) {
      if (name === "@/lib/db") return { sql };
      if (name === "@/lib/supabase") return {
        getSupabase: getSupabase ?? (() => ({
          from(table) {
            const query = { table };
            queries.push(query);
            return {
              select(columns, options) {
                Object.assign(query, { columns, options });
                return { limit: async (n) => { query.limit = n; return supabaseQuery ?? { error: null }; } };
              },
            };
          },
          auth: { getSession: async () => { throw new Error("health must not rely on getSession"); } },
        })),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { ...exports, timers, queries };
}

test("both checks pass and clear their timeout timers", async () => {
  const health = load();
  assert.equal((await health.checkNeonDB()).status, "pass");
  assert.equal((await health.checkSupabase()).status, "pass");
  assert.equal(health.timers.set, 2);
  assert.equal(health.timers.cleared, 2);
});

test("the Supabase check makes a real head query instead of a local session read", async () => {
  const health = load();
  await health.checkSupabase();
  assert.deepEqual(JSON.parse(JSON.stringify(health.queries)), [{ table: "bazaar_providers", columns: "id", options: { head: true }, limit: 1 }]);
});

test("a Supabase query error fails the check", async () => {
  const health = load({ supabaseQuery: { error: { message: "FetchError: getaddrinfo ENOTFOUND abc.supabase.co" } } });
  const result = await health.checkSupabase();
  assert.equal(result.status, "fail");
  assert.equal(result.message, "unavailable");
});

test("driver error text is not exposed, but timeouts and missing configuration are", async () => {
  const leaky = load({ sql: async () => { throw new Error("password authentication failed for user neondb_owner at ep-x.neon.tech"); } });
  const result = await leaky.checkNeonDB();
  assert.equal(result.status, "fail");
  assert.equal(result.message, "unavailable");

  const unconfigured = load({
    sql: () => { throw new Error("DATABASE_URL is required"); },
    getSupabase: () => { throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"); },
  });
  assert.equal((await unconfigured.checkNeonDB()).message, "DATABASE_URL is required");
  assert.equal((await unconfigured.checkSupabase()).message, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
});

test("a hung dependency fails with 'timeout' after three seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const health = load({ sql: () => new Promise(() => {}) });
  const pending = health.checkNeonDB();
  await Promise.resolve();
  t.mock.timers.tick(3000);
  const result = await pending;
  assert.equal(result.status, "fail");
  assert.equal(result.message, "timeout");
});
