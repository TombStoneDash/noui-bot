import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const source = await readFile(
  new URL("../src/app/api/bazaar/billing/rotate-key/route.ts", import.meta.url),
  "utf8"
);
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const OLD_KEY = "bz_old";
const OLD_HASH = createHash("sha256").update(OLD_KEY).digest("hex");

// In-memory bazaar_api_keys table.
function harness({ failInsert = false, failRevoke = false } = {}) {
  const keys = [{ id: "k-old", key_hash: OLD_HASH, owner_type: "provider", owner_id: "prov-1", rate_limit_rpm: 300, scopes: null, revoked_at: null }];
  const sb = {
    from(table) {
      assert.equal(table, "bazaar_api_keys");
      let op = null;
      let payload = null;
      const filters = [];
      const run = () => {
        if (op === "insert") {
          if (failInsert) return { data: null, error: { message: "insert failed" } };
          const row = { id: `k-${keys.length}`, revoked_at: null, ...payload };
          keys.push(row);
          return { data: { id: row.id }, error: null };
        }
        const matches = keys.filter((k) => filters.every(([c, v]) => k[c] === v));
        if (op === "update") {
          if (failRevoke && filters.some(([c]) => c === "key_hash")) return { error: { message: "revoke failed" } };
          matches.forEach((k) => Object.assign(k, payload));
          return { error: null };
        }
        return { data: matches[0] ?? null, error: matches[0] ? null : { message: "not found" } };
      };
      const builder = {
        select: () => { op ??= "select"; return builder; },
        insert: (row) => { op = "insert"; payload = row; return builder; },
        update: (row) => { op = "update"; payload = row; return builder; },
        eq: (c, v) => { filters.push([c, v]); return builder; },
        single: async () => run(),
        then: (resolve) => resolve(run()),
      };
      return builder;
    },
  };
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      }
      if (name === "crypto") return { createHash };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") {
        return {
          authenticateKey: async () => ({ id: "prov-1", type: "provider" }),
          generateBazaarKey: () => ({ key: "bz_new", hash: "hash-new", prefix: "bz_new" }),
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
    Response,
    Date,
  });
  vm.runInContext(outputText, context);
  const request = new Request("https://noui.bot/api/bazaar/billing/rotate-key", {
    method: "POST",
    headers: { authorization: `Bearer ${OLD_KEY}` },
  });
  const live = () => keys.filter((k) => k.revoked_at === null).map((k) => k.key_hash);
  return { POST: () => context.exports.POST(request), live, keys };
}

test("rotation issues a new key that inherits settings and revokes the old one", async () => {
  const h = harness();
  const response = await h.POST();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).new_key, "bz_new");
  assert.deepEqual(h.live(), ["hash-new"]);
  assert.equal(h.keys.find((k) => k.key_hash === "hash-new").rate_limit_rpm, 300);
});

test("a failed insert leaves the old key working instead of locking the provider out", async () => {
  const h = harness({ failInsert: true });
  const response = await h.POST();
  assert.equal(response.status, 500);
  assert.deepEqual(h.live(), [OLD_HASH]);
});

test("a failed revoke withdraws the new key so two live keys are not left behind", async () => {
  const h = harness({ failRevoke: true });
  const response = await h.POST();
  assert.equal(response.status, 500);
  assert.deepEqual(h.live(), [OLD_HASH]);
});
