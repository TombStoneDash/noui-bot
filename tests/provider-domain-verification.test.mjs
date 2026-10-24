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
const source = await readFile(new URL("../src/app/api/v1/bazaar/providers/verify/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const OWNER = { id: "0123456789abcdef", type: "provider", email: "p@example.com" };

// One provider row; supports select().eq().single() and update().eq().
function fakeSupabase(row, updateError = null) {
  const updates = [];
  return {
    updates,
    from(table) {
      assert.equal(table, "bazaar_providers");
      return {
        select() {
          return { eq: () => ({ single: async () => ({ data: { ...row }, error: null }) }) };
        },
        update(patch) {
          return {
            async eq(column, value) {
              assert.deepEqual([column, value], ["id", OWNER.id]);
              if (updateError) return { error: updateError };
              updates.push(patch);
              Object.assign(row, patch);
              return { error: null };
            },
          };
        },
      };
    },
  };
}

function loadRoute({ row = { verification_level: "unverified", verification_metadata: {} }, txt = {}, updateError = null } = {}) {
  const sb = fakeSupabase(row, updateError);
  const lookups = [];
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    URL,
    console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => OWNER };
      if (name === "node:crypto") return { randomUUID: () => "11111111-2222-3333-4444-555555555555" };
      if (name === "node:dns/promises") return {
        async resolveTxt(hostname) {
          lookups.push(hostname);
          if (!(hostname in txt)) throw Object.assign(new Error("queryTxt ENOTFOUND"), { code: "ENOTFOUND" });
          if (txt[hostname] instanceof Error) throw txt[hostname];
          return txt[hostname];
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { POST: exports.POST, row, updates: sb.updates, lookups };
}

async function call(POST, body) {
  const res = await POST(new Request("https://example.test/api/v1/bazaar/providers/verify", {
    method: "POST",
    headers: { authorization: "Bearer bz_x" },
    body: JSON.stringify(body),
  }));
  return { status: res.status, data: await res.json() };
}

test("domain verification completes once the TXT record is published", async () => {
  const route = loadRoute();
  const first = await call(route.POST, { level: "domain", domain: "Example.COM." });
  assert.equal(first.status, 200);
  assert.equal(first.data.verified, false);
  assert.equal(first.data.challenge.record_name, "_noui-verify.example.com");
  const token = first.data.challenge.record_value;
  assert.equal(route.row.verification_metadata.domain, "example.com");

  // Not published yet: same challenge comes back, nothing is overwritten.
  const early = await call(route.POST, { level: "domain", domain: "example.com" });
  assert.equal(early.data.verified, false);
  assert.equal(early.data.challenge.record_value, token);
  assert.equal(route.updates.length, 1);
  assert.match(early.data.message, /not found yet/);

  // Published (TXT values may arrive split into chunks).
  const half = Math.floor(token.length / 2);
  const done = loadRoute({
    row: route.row,
    txt: { "_noui-verify.example.com": [["v=spf1 -all"], [token.slice(0, half), token.slice(half)]] },
  });
  const final = await call(done.POST, { level: "domain", domain: "example.com" });
  assert.equal(final.status, 200);
  assert.equal(final.data.verified, true);
  assert.equal(final.data.verification_level, "domain");
  assert.equal(done.row.verification_level, "domain");
  assert.equal(done.row.verification_metadata.status, "verified");
  assert.deepEqual(done.lookups, ["_noui-verify.example.com"]);
});

test("a wrong TXT value does not verify", async () => {
  const row = {
    verification_level: "email",
    verification_metadata: { method: "dns_txt", domain: "example.com", status: "pending", challenge_token: "noui-verify-good" },
  };
  const route = loadRoute({ row, txt: { "_noui-verify.example.com": [["noui-verify-bad"]] } });
  const res = await call(route.POST, { level: "domain", domain: "example.com" });
  assert.equal(res.data.verified, false);
  assert.equal(route.row.verification_level, "email");
  assert.equal(route.updates.length, 0);
});

test("domain verification never downgrades a code-verified provider", async () => {
  const row = {
    verification_level: "code",
    verification_metadata: { method: "dns_txt", domain: "example.com", status: "pending", challenge_token: "tok" },
  };
  const route = loadRoute({ row, txt: { "_noui-verify.example.com": [["tok"]] } });
  const res = await call(route.POST, { level: "domain", domain: "example.com" });
  assert.equal(res.data.verified, true);
  assert.equal(res.data.verification_level, "code");
  assert.equal(route.row.verification_level, "code");
});

test("a different domain starts a new challenge instead of checking DNS", async () => {
  const row = {
    verification_level: "unverified",
    verification_metadata: { method: "dns_txt", domain: "old.example", status: "pending", challenge_token: "tok" },
  };
  const route = loadRoute({ row });
  const res = await call(route.POST, { level: "domain", domain: "new.example" });
  assert.equal(res.data.challenge.record_name, "_noui-verify.new.example");
  assert.notEqual(res.data.challenge.record_value, "tok");
  assert.deepEqual(route.lookups, []);
});

for (const domain of [undefined, 42, "", "localhost", "exa mple.com", "-bad.com", "a..b.com",
  "example.com/path", "https://example.com", "x.com\nevil", `${"a".repeat(64)}.com`]) {
  test(`domain ${JSON.stringify(domain)} is rejected without touching the provider`, async () => {
    const route = loadRoute();
    const res = await call(route.POST, { level: "domain", domain });
    assert.equal(res.status, 422);
    assert.equal(route.updates.length, 0);
  });
}

for (const body of [null, [], "domain"]) {
  test(`body ${JSON.stringify(body)} is a 400, not a crash`, async () => {
    const route = loadRoute();
    const res = await call(route.POST, body);
    assert.equal(res.status, 400);
  });
}

test("the provider quickstart uses the real register and verify contracts", async () => {
  const page = await readFile(new URL("../src/app/docs/guides/provider-quickstart/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /baz_sk_/);
  assert.match(page, /curl -X POST https:\/\/noui\.bot\/api\/bazaar\/register-provider /);
  const register = await readFile(new URL("../src/app/api/bazaar/register-provider/route.ts", import.meta.url), "utf8");
  for (const field of ["name", "email", "endpoint_url"]) {
    assert.match(register, new RegExp(`body\\.${field}\\b`));
    assert.match(page, new RegExp(`"${field}":`));
  }
  assert.match(page, /"level": "email"/);
  assert.match(page, /"level": "domain", "domain": "example\.com"/);
  assert.doesNotMatch(page, /"method": "email"/);
});

test("email verification never downgrades a domain- or code-verified provider", async () => {
  for (const level of ["domain", "code"]) {
    const metadata = { method: "dns_txt", domain: "example.com", status: "verified" };
    const route = loadRoute({ row: { verification_level: level, verification_metadata: metadata } });
    const res = await call(route.POST, { level: "email" });
    assert.equal(res.status, 200);
    assert.equal(res.data.verified, true);
    assert.equal(res.data.verification_level, level);
    assert.equal(route.updates.length, 0);
    assert.equal(route.row.verification_level, level);
    assert.deepEqual(route.row.verification_metadata, metadata);
  }

  const fresh = loadRoute();
  const res = await call(fresh.POST, { level: "email" });
  assert.equal(res.data.verification_level, "email");
  assert.equal(fresh.row.verification_level, "email");
});

test("a DNS failure other than not-found is a 503 and keeps the pending challenge", async () => {
  const pending = { method: "dns_txt", domain: "example.com", status: "pending", challenge_token: "noui-verify-good" };
  const servfail = Object.assign(new Error("queryTxt ESERVFAIL"), { code: "ESERVFAIL" });
  const route = loadRoute({
    row: { verification_level: "unverified", verification_metadata: { ...pending } },
    txt: { "_noui-verify.example.com": servfail },
  });
  const res = await call(route.POST, { level: "domain", domain: "example.com" });
  assert.equal(res.status, 503);
  assert.equal(res.data.code, "DNS_LOOKUP_FAILED");
  assert.equal(res.data.challenge.record_value, "noui-verify-good");
  assert.equal(route.updates.length, 0);
  assert.deepEqual(route.row.verification_metadata, pending);
});

test("code verification requires an https repo_url string", async () => {
  for (const repo_url of [undefined, "", 42, { href: "https://github.com/a/b" }, "github.com/a/b",
    "http://github.com/a/b", "javascript:alert(1)", "https://user:pw@github.com/a/b",
    `https://github.com/${"a".repeat(600)}`]) {
    const route = loadRoute();
    const res = await call(route.POST, { level: "code", repo_url });
    assert.equal(res.status, 422, `repo_url ${JSON.stringify(repo_url)}`);
    assert.equal(route.updates.length, 0);
  }

  const route = loadRoute();
  const res = await call(route.POST, { level: "code", repo_url: "  https://github.com/org/repo  " });
  assert.equal(res.status, 200);
  assert.equal(route.row.verification_metadata.repo_url, "https://github.com/org/repo");
});

test("database errors are not echoed to the caller", async () => {
  const route = loadRoute({ updateError: { message: 'relation "bazaar_providers" violates constraint secret_col' } });
  for (const body of [{ level: "email" }, { level: "domain", domain: "example.com" }, { level: "code", repo_url: "https://github.com/o/r" }]) {
    const res = await call(route.POST, body);
    assert.equal(res.status, 500);
    assert.equal(res.data.code, "STORAGE_ERROR");
    assert.doesNotMatch(JSON.stringify(res.data), /secret_col|relation/);
  }
});
