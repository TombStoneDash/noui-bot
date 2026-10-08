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
const source = await readFile(new URL("../src/app/api/validate-humans-txt/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const target = "https://example.com/.well-known/humans.txt";

function loadRoute(fetch) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const scheduled = [];
  const cleared = [];
  const context = vm.createContext({
    exports: {},
    AbortController,
    Error,
    fetch(url, options) {
      assert.equal(url, target);
      assert.ok(options.signal instanceof AbortSignal);
      return fetch(url, options);
    },
    setTimeout(callback, delay) {
      const id = ++nextId;
      scheduled.push({ id, delay });
      timers.set(id, { callback, deadline: now + delay });
      return id;
    },
    clearTimeout(id) {
      cleared.push(id);
      timers.delete(id);
    },
    require(name) {
      assert.equal(name, "next/server");
      return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    },
  });
  vm.runInContext(outputText, context);
  return {
    run: () => context.exports.GET({ nextUrl: new URL(`https://validator.example/api?url=${encodeURIComponent(target)}`) }),
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of timers) {
        if (timer.deadline <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
    assertActive() {
      assert.deepEqual(scheduled, [{ id: 1, delay: 8000 }]);
      assert.equal(timers.size, 1);
      assert.deepEqual(cleared, []);
    },
    assertCleaned() {
      assert.deepEqual(scheduled, [{ id: 1, delay: 8000 }]);
      assert.equal(timers.size, 0);
      assert.deepEqual(cleared, [1]);
    },
  };
}

function controlledBody() {
  let complete;
  let signal;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  return {
    started,
    get signal() { return signal; },
    complete(text) { complete(text); },
    fetch: async (_url, options) => {
      signal = options.signal;
      return {
        ok: true,
        text() {
          const body = new Promise((resolve, reject) => {
            const onAbort = () => reject(signal.reason);
            complete = (text) => {
              signal.removeEventListener("abort", onAbort);
              resolve(text);
            };
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
          });
          markStarted();
          return body;
        },
      };
    },
  };
}

test("immediate headers and a stalled body abort at eight seconds with a fetch-failure response", async () => {
  const body = controlledBody();
  const route = loadRoute(body.fetch);
  const pending = route.run();
  await body.started;
  route.assertActive();
  route.advance(7999);
  assert.equal(body.signal.aborted, false);
  route.assertActive();
  route.advance(1);
  assert.equal(body.signal.aborted, true);
  const response = await pending;
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: body.signal.reason.message });
  route.assertCleaned();
});

test("body completion before the deadline preserves successful JSON and clears the timer", async () => {
  const body = controlledBody();
  const route = loadRoute(body.fetch);
  const pending = route.run();
  await body.started;
  route.assertActive();
  route.advance(7999);
  const document = { platform: { name: "Example" }, message: "Hello" };
  body.complete(JSON.stringify(document));
  const response = await pending;
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), document);
  route.assertCleaned();
  route.advance(1);
  assert.equal(body.signal.aborted, false);
});

test("fetch rejection returns the existing failure response and clears the timer", async () => {
  const route = loadRoute(async () => { throw new Error("Network unavailable"); });
  const response = await route.run();
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Network unavailable" });
  route.assertCleaned();
});

for (const status of [404, 429, 503]) {
  test(`non-OK HTTP ${status} propagates its status and clears the timer`, async () => {
    const route = loadRoute(async () => ({
      ok: false,
      status,
      text() { assert.fail("Non-OK bodies should not be read"); },
    }));
    const response = await route.run();
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: `HTTP ${status}` });
    route.assertCleaned();
  });
}

test("invalid JSON preserves HTTP 422 and the truncated raw body and clears the timer", async () => {
  const body = controlledBody();
  const route = loadRoute(body.fetch);
  const pending = route.run();
  await body.started;
  route.assertActive();
  const text = "not JSON ".repeat(100);
  body.complete(text);
  const response = await pending;
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: "Response is not valid JSON",
    raw: text.slice(0, 500),
  });
  route.assertCleaned();
  route.advance(8000);
  assert.equal(body.signal.aborted, false);
});
