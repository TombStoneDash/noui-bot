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
const verifySource = await transpile("../src/app/api/v1/bot-captcha/verify/route.ts");

/* ── store ─────────────────────────────────────────────── */

// Minimal Supabase stand-in for `update().eq().eq().select()` on challenges.
function fakeSupabase(rows) {
  return {
    from(table) {
      assert.equal(table, "bot_captcha_challenges");
      return {
        update(patch) {
          const filters = [];
          const chain = {
            eq(column, value) { filters.push([column, value]); return chain; },
            async select() {
              const matched = rows.filter((row) => filters.every(([c, v]) => row[c] === v));
              for (const row of matched) Object.assign(row, patch);
              return { data: matched.map((row) => ({ id: row.id })), error: null };
            },
          };
          return chain;
        },
      };
    },
  };
}

function loadStore(rows = []) {
  const exports = {};
  vm.runInNewContext(storeSource, {
    exports,
    crypto,
    TextEncoder,
    require(name) {
      if (name === "@/lib/supabase") return { getSupabase: () => fakeSupabase(rows) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

test("consumeChallenge succeeds once and reports a second claim as lost", async () => {
  const rows = [{ id: "c1", consumed: false }];
  const store = loadStore(rows);
  assert.equal(await store.consumeChallenge("c1"), true);
  assert.equal(await store.consumeChallenge("c1"), false);
  assert.equal(rows[0].consumed, true);
  assert.equal(await store.consumeChallenge("missing"), false);
});

test("rate limits are counted per endpoint scope", () => {
  const store = loadStore();
  const T0 = 1_000_000;
  // Polling stats or verifying tokens must not use up the challenge budget.
  for (let i = 0; i < 50; i++) {
    assert.equal(store.checkRateLimit("ip", 100, "stats", T0 + i), true);
    assert.equal(store.checkRateLimit("ip", 100, "token-verify", T0 + i), true);
  }
  for (let i = 0; i < 10; i++) {
    assert.equal(store.checkRateLimit("ip", 10, "challenge", T0 + 100 + i), true);
  }
  assert.equal(store.checkRateLimit("ip", 10, "challenge", T0 + 200), false);
  assert.equal(store.checkRateLimit("other-ip", 10, "challenge", T0 + 200), true);
  // The window slides: a minute later the challenge budget is back.
  assert.equal(store.checkRateLimit("ip", 10, "challenge", T0 + 100 + 60_000), true);
});

test("rate-limit store stays bounded under many distinct IPs", () => {
  const store = loadStore();
  for (let i = 0; i < 10_050; i++) store.checkRateLimit(`ip-${i}`, 10, "challenge", 1_000 + i);
  assert.equal(store._rateLimitKeyCount(), 10_000);
  // The most recent caller is still being limited correctly.
  for (let i = 1; i < 10; i++) assert.equal(store.checkRateLimit("ip-10049", 10, "challenge", 20_000), true);
  assert.equal(store.checkRateLimit("ip-10049", 10, "challenge", 20_000), false);
});

/* ── verify route ──────────────────────────────────────── */

const CHALLENGE_ID = "8f14e45f-ceea-4e7a-9c3b-1d2a3b4c5d6e";
const ANSWER = "eu-central-1";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.toLowerCase()));
  return Buffer.from(buf).toString("hex");
}

async function loadVerify({ challenge, issuedAgoMs = 10 } = {}) {
  const now = Date.now();
  const row = challenge === null ? null : {
    id: CHALLENGE_ID,
    type: "json_extract",
    level: 1,
    answer_hash: await sha256Hex(ANSWER),
    // Generous so cold-start test latency never trips the timeout path.
    time_limit_ms: 30_000,
    issued_at: new Date(now - issuedAgoMs).toISOString(),
    expires_at: new Date(now + 60_000).toISOString(),
    consumed: false,
    ...challenge,
  };
  const calls = { getChallenge: 0, consume: 0, recorded: [] };
  const exports = {};
  vm.runInNewContext(verifySource, {
    exports,
    process: { env: { NODE_ENV: "production" } },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/botproof-store") return {
        hashIP: async (ip) => `hash:${ip}`,
        checkRateLimit: () => true,
        async getChallenge(id) {
          calls.getChallenge++;
          // Each request reads a snapshot, as separate database reads would.
          return row && row.id === id ? { ...row } : null;
        },
        async consumeChallenge(id) {
          calls.consume++;
          await new Promise((resolve) => setTimeout(resolve, 1));
          if (!row || row.id !== id || row.consumed) return false;
          row.consumed = true;
          return true;
        },
        hashAnswer: sha256Hex,
        async recordVerification(v) { calls.recorded.push(v); },
        randomBase62: (n) => "x".repeat(n),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { POST: exports.POST, calls, row };
}

function post(POST, body) {
  return POST(new Request("https://example.test/api/v1/bot-captcha/verify", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.1" },
    body: JSON.stringify(body),
  }));
}

test("a correct answer issues a token and records sanitized metadata", async () => {
  const { POST, calls } = await loadVerify();
  const res = await post(POST, {
    challenge_id: CHALLENGE_ID,
    response: ` ${ANSWER} `,
    agent_id: "agent-7",
    metadata: { agent_name: "  Daisy  ", model: "claude-opus-5-5" },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.verified, true);
  assert.match(data.token, /^pob_live_/);
  assert.equal(data.agent_id, "agent-7");
  assert.equal(calls.recorded.length, 1);
  assert.equal(calls.recorded[0].agentName, "Daisy");
  assert.equal(calls.recorded[0].framework, null);
});

test("concurrent correct submissions redeem a challenge only once", async () => {
  const { POST, calls } = await loadVerify();
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => post(POST, { challenge_id: CHALLENGE_ID, response: ANSWER })),
  );
  const bodies = await Promise.all(responses.map((r) => r.json()));
  assert.equal(bodies.filter((b) => b.verified === true).length, 1);
  assert.deepEqual(
    bodies.filter((b) => b.verified === false).map((b) => b.reason),
    ["already_used", "already_used", "already_used", "already_used"],
  );
  assert.equal(calls.recorded.filter((v) => v.token).length, 1);
});

test("an already consumed challenge is rejected without another claim", async () => {
  const { POST, calls } = await loadVerify({ challenge: { consumed: true } });
  const res = await post(POST, { challenge_id: CHALLENGE_ID, response: ANSWER });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).reason, "already_used");
  assert.equal(calls.consume, 0);
});

for (const [label, overrides, reason] of [
  ["wrong answer", { response: "us-west-2" }, "incorrect"],
  ["slow answer", { slow: true }, "timeout"],
]) {
  test(`a ${label} burns the challenge so it cannot be retried`, async () => {
    const { POST, row } = await loadVerify({ issuedAgoMs: overrides.slow ? 45_000 : 10 });
    const res = await post(POST, { challenge_id: CHALLENGE_ID, response: overrides.response ?? ANSWER });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).reason, reason);
    assert.equal(row.consumed, true);
    const retry = await post(POST, { challenge_id: CHALLENGE_ID, response: ANSWER });
    assert.equal((await retry.json()).reason, "already_used");
  });
}

test("an expired challenge is rejected", async () => {
  const { POST } = await loadVerify({
    challenge: { expires_at: new Date(Date.now() - 1_000).toISOString() },
  });
  const res = await post(POST, { challenge_id: CHALLENGE_ID, response: ANSWER });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).reason, "expired");
});

test("a malformed challenge_id is not found without a database read", async () => {
  const { POST, calls } = await loadVerify();
  const res = await post(POST, { challenge_id: "not-a-uuid", response: ANSWER });
  assert.equal(res.status, 404);
  assert.equal(calls.getChallenge, 0);
});

for (const [label, body] of [
  ["non-string challenge_id", { challenge_id: 123, response: ANSWER }],
  ["object response", { challenge_id: CHALLENGE_ID, response: { a: 1 } }],
  ["array metadata", { challenge_id: CHALLENGE_ID, response: ANSWER, metadata: [] }],
  ["object agent_name", { challenge_id: CHALLENGE_ID, response: ANSWER, metadata: { agent_name: { html: "<b>" } } }],
  ["overlong agent_name", { challenge_id: CHALLENGE_ID, response: ANSWER, metadata: { agent_name: "a".repeat(65) } }],
  ["numeric model", { challenge_id: CHALLENGE_ID, response: ANSWER, metadata: { model: 5 } }],
  ["overlong agent_id", { challenge_id: CHALLENGE_ID, response: ANSWER, agent_id: "a".repeat(129) }],
  ["array body", [CHALLENGE_ID, ANSWER]],
]) {
  test(`${label} is rejected before the challenge is touched`, async () => {
    const { POST, calls, row } = await loadVerify();
    const res = await post(POST, body);
    assert.equal(res.status, 400);
    assert.equal(calls.getChallenge, 0);
    assert.equal(row.consumed, false);
  });
}
