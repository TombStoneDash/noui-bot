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

const storeSource = await transpile("../src/lib/botproof-store.ts");
const tokenVerifySource = await transpile("../src/app/api/v1/botproof/token-verify/route.ts");
const verifySource = await transpile("../src/app/api/v1/bot-captcha/verify/route.ts");
const challengeSource = await transpile("../src/app/api/v1/bot-captcha/challenge/route.ts");

const nextServer = {
  NextResponse: { json: (body, init) => Response.json(body, init) },
};

function load(source, store) {
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    crypto,
    TextEncoder,
    process: { env: { NODE_ENV: "production" } },
    require(name) {
      if (name === "next/server") return nextServer;
      if (name === "@/lib/botproof-store") return store;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

/* ── store lookups ─────────────────────────────────────── */

// Supabase stand-in for `select().eq()...maybeSingle()` returning a fixed result.
function loadStore(result) {
  const exports = {};
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    async maybeSingle() { return result; },
    async single() { throw new Error("single() reports a missing row as an error; use maybeSingle()"); },
  };
  vm.runInNewContext(storeSource, {
    exports,
    crypto,
    TextEncoder,
    require(name) {
      if (name === "@/lib/supabase") return { getSupabase: () => ({ from: () => chain }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

test("store lookups return null for a missing row but throw on a database error", async () => {
  const missing = loadStore({ data: null, error: null });
  assert.equal(await missing.getChallenge("c1"), null);
  assert.equal(await missing.getVerificationByToken("pob_live_x"), null);

  const broken = loadStore({ data: null, error: { message: "connection refused" } });
  await assert.rejects(broken.getChallenge("c1"), /getChallenge: connection refused/);
  await assert.rejects(broken.getVerificationByToken("pob_live_x"), /getVerificationByToken: connection refused/);
});

/* ── token-verify ──────────────────────────────────────── */

function tokenVerify(lookup) {
  const { GET } = load(tokenVerifySource, {
    hashIP: async (ip) => `hash:${ip}`,
    checkRateLimit: () => true,
    getVerificationByToken: lookup,
  });
  const url = new URL("https://example.test/api/v1/botproof/token-verify?token=pob_live_abc");
  const request = new Request(url);
  request.nextUrl = url;
  return GET(request);
}

function row(expiresAt) {
  return {
    token: "pob_live_abc",
    level: 1,
    challenge_type: "arithmetic",
    response_time_ms: 42,
    issued_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: expiresAt,
  };
}

test("token-verify reports a lookup outage as 503, not as an invalid token", async () => {
  const res = await tokenVerify(async () => { throw new Error("getVerificationByToken: timeout"); });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.valid, undefined);
  assert.match(body.error, /temporarily unavailable/);
});

test("token-verify rejects tokens with a missing or unreadable expiry", async () => {
  for (const expiresAt of [null, "", "not-a-date"]) {
    const res = await tokenVerify(async () => row(expiresAt));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { valid: false, reason: "invalid_expiry" });
  }
});

test("token-verify rejects expired tokens without caching the answer", async () => {
  const res = await tokenVerify(async () => row(new Date(Date.now() - 1000).toISOString()));
  assert.deepEqual(await res.json(), { valid: false, reason: "expired" });
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("unknown tokens are not cached", async () => {
  const res = await tokenVerify(async () => null);
  assert.deepEqual(await res.json(), { valid: false });
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("a valid token is cached for at most a minute and never past its expiry", async () => {
  const longLived = await tokenVerify(async () => row(new Date(Date.now() + 3_600_000).toISOString()));
  assert.equal((await longLived.json()).valid, true);
  assert.equal(longLived.headers.get("cache-control"), "public, max-age=0, s-maxage=60");

  const nearlyExpired = await tokenVerify(async () => row(new Date(Date.now() + 10_500).toISOString()));
  assert.equal((await nearlyExpired.json()).valid, true);
  const maxAge = Number(nearlyExpired.headers.get("cache-control").match(/s-maxage=(\d+)/)[1]);
  assert.ok(maxAge >= 9 && maxAge <= 10, `s-maxage ${maxAge} must not outlive the token`);
  assert.doesNotMatch(nearlyExpired.headers.get("cache-control"), /stale-while-revalidate/);
});

/* ── bot-captcha verify ────────────────────────────────── */

test("verify reports a challenge lookup outage as 503, not not_found", async () => {
  const { POST } = load(verifySource, {
    hashIP: async (ip) => `hash:${ip}`,
    checkRateLimit: () => true,
    async getChallenge() { throw new Error("getChallenge: timeout"); },
    async consumeChallenge() { throw new Error("must not claim"); },
    hashAnswer: async (a) => a,
    async recordVerification() { throw new Error("must not record"); },
    randomBase62: (n) => "x".repeat(n),
  });
  const res = await POST(new Request("https://example.test/api/v1/bot-captcha/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challenge_id: "8f14e45f-ceea-4e7a-9c3b-1d2a3b4c5d6e", response: "1" }),
  }));
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /temporarily unavailable/);
});

/* ── bot-captcha challenge ─────────────────────────────── */

function challengeRoute() {
  const stored = [];
  const { POST } = load(challengeSource, {
    hashIP: async (ip) => `hash:${ip}`,
    checkRateLimit: () => true,
    async storeChallenge(c) { stored.push(c); },
    hashAnswer: async (a) => `h:${a}`,
    randomBase62: (n) => "a".repeat(n),
  });
  return { POST, stored };
}

test("challenge treats a null, array or malformed body as a level 1 request", async () => {
  for (const body of ["null", "[]", "[3]", "{not json", ""]) {
    const { POST, stored } = challengeRoute();
    const res = await POST(new Request("https://example.test/api/v1/bot-captcha/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }));
    assert.equal(res.status, 200, `body ${JSON.stringify(body)}`);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].level, 1);
  }
});

test("challenge still rejects levels that are not implemented", async () => {
  const { POST, stored } = challengeRoute();
  const res = await POST(new Request("https://example.test/api/v1/bot-captcha/challenge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ level: 2 }),
  }));
  assert.equal(res.status, 400);
  assert.equal(stored.length, 0);
});
