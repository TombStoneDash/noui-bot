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
const source = await readFile(new URL("../src/app/api/v1/bot-captcha/leaderboard/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadRoute({ results = [], allowed = true } = {}) {
  const leaderboardLimits = [];
  const rateLimitCalls = [];
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/botproof-store") return {
        hashIP: async (ip) => `hash:${ip}`,
        checkRateLimit(ipHash, maxPerMin) {
          rateLimitCalls.push([ipHash, maxPerMin]);
          return allowed;
        },
        getLeaderboard(limit) {
          leaderboardLimits.push(limit);
          return typeof results === "function" ? results() : Promise.resolve(results);
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: "bot-captcha/leaderboard/route.js" });
  return { GET: exports.GET, leaderboardLimits, rateLimitCalls };
}

function request(search = "") {
  const url = new URL(`https://example.test/api/v1/bot-captcha/leaderboard${search}`);
  return { headers: new Headers({ "x-forwarded-for": "192.0.2.10, 198.51.100.2" }), nextUrl: url };
}

const cacheControl = "public, s-maxage=30, stale-while-revalidate=60";

test("empty successful query returns no invented entries", async () => {
  const route = loadRoute();
  const response = await route.GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { entries: [], count: 0 });
  assert.equal(response.headers.get("Cache-Control"), cacheControl);
  assert.deepEqual(route.leaderboardLimits, [10]);
  assert.deepEqual(route.rateLimitCalls, [["hash:192.0.2.10", 100]]);
});

test("returns only store records and passes the requested limit", async () => {
  const records = [
    { agent_name: "Measured A", model: "model-a", level: 2, response_time_ms: 81, challenge_type: "arithmetic", verified_at: "2026-10-08T12:00:00Z" },
    { agent_name: "Measured B", model: "model-b", level: 1, response_time_ms: 95, challenge_type: "hash_sha256", verified_at: "2026-10-08T12:01:00Z" },
  ];
  for (const limit of [1, 2, 50]) {
    const route = loadRoute({ results: records });
    const response = await route.GET(request(`?limit=${limit}`));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { entries: records.slice(0, limit), count: Math.min(records.length, limit) });
    assert.equal(response.headers.get("Cache-Control"), cacheControl);
    assert.deepEqual(route.leaderboardLimits, [limit]);
  }
});

for (const value of ["", "0", "51", "-1", "1.5", "abc", "2abc", " 2", "+2", "1e1", "0x10", "Infinity", "9007199254740993"]) {
  test(`rejects invalid limit ${JSON.stringify(value)} before store access`, async () => {
    const route = loadRoute();
    const response = await route.GET(request(`?limit=${encodeURIComponent(value)}`));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Limit must be an integer from 1 to 50." });
    assert.deepEqual(route.leaderboardLimits, []);
  });
}

test("rate limiting stays ahead of store access", async () => {
  const route = loadRoute({ allowed: false });
  const response = await route.GET(request("?limit=2"));
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "Rate limit exceeded." });
  assert.deepEqual(route.rateLimitCalls, [["hash:192.0.2.10", 100]]);
  assert.deepEqual(route.leaderboardLimits, []);
});

test("store rejection returns unavailable without exposing details", async () => {
  const route = loadRoute({ results: () => Promise.reject(new Error("secret database detail")) });
  const response = await route.GET(request("?limit=3"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Leaderboard unavailable." });
  assert.equal(response.headers.get("Cache-Control"), null);
  assert.deepEqual(route.leaderboardLimits, [3]);
});
