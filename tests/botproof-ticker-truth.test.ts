import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));
const source = readFileSync(new URL("../src/app/bot-captcha/BotCaptchaClient.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

type Element = { type: unknown; props: Record<string, unknown> };
type Stats = { humans_tested: number; humans_failed: number; bots_verified: number };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness() {
  const slots: unknown[] = [];
  const effects: Array<() => void | (() => void)> = [];
  const intervals = new Map<number, { callback: () => void; ms: number }>();
  const requests: Array<ReturnType<typeof deferred<{ ok: boolean; json: () => Promise<unknown> }>>> = [];
  let cursor = 0;
  let nextTimer = 1;
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value: unknown) => {
        slots[index] = typeof value === "function" ? value(slots[index]) : value;
      }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect: () => void | (() => void)) { cursor++; effects.push(effect); },
    useCallback(callback: unknown) { cursor++; return callback; },
  };
  const jsx = (type: unknown, props: Record<string, unknown>): Element => ({ type, props });
  const exports: { BotCaptcha?: () => Element } = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    crypto: webcrypto,
    fetch(url: string, options: { cache: string }) {
      assert.equal(url, "/api/v1/bot-captcha/stats");
      assert.equal(options.cache, "no-store");
      const request = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
      requests.push(request);
      return request.promise;
    },
    setInterval(callback: () => void, ms: number) {
      const id = nextTimer++;
      intervals.set(id, { callback, ms });
      return id;
    },
    clearInterval(id: number) { intervals.delete(id); },
    setTimeout() { throw new Error("Unexpected timeout"); },
    Date,
    Math,
    TextEncoder,
    Uint8Array,
  }, { filename: "BotCaptchaClient.js" });

  function render(): Element {
    cursor = 0;
    effects.length = 0;
    return exports.BotCaptcha!();
  }
  function tickerText(): string {
    const find = (node: unknown): Element | undefined => {
      if (Array.isArray(node)) return node.map(find).find(Boolean);
      if (!node || typeof node !== "object" || !("props" in node)) return undefined;
      const element = node as Element;
      if (typeof element.props.className === "string" && element.props.className.includes("tracking-[3px]")) return element;
      return find(element.props.children);
    };
    const flatten = (node: unknown): string => {
      if (Array.isArray(node)) return node.map(flatten).join("");
      if (node && typeof node === "object" && "props" in node) return flatten((node as Element).props.children);
      return typeof node === "string" || typeof node === "number" ? String(node) : "";
    };
    return flatten(find(render()));
  }
  function start() {
    render();
    const cleanup = effects[0]();
    assert.equal(typeof cleanup, "function");
    return cleanup as () => void;
  }
  function respond(index: number, totals: unknown, ok = true) {
    requests[index].resolve({ ok, json: async () => totals });
  }
  function advance() {
    for (const timer of [...intervals.values()]) timer.callback();
  }
  return { start, tickerText, requests, respond, advance, intervals };
}

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test("ticker starts pending and shows valid zero and nonzero totals only after responses", async () => {
  const app = harness();
  const cleanup = app.start();
  assert.match(app.tickerText(), /… humans tested.*… failed.*… bots verified/);
  assert.equal(app.requests.length, 1);
  assert.deepEqual([...app.intervals.values()].map(({ ms }) => ms), [30000]);

  app.respond(0, { humans_tested: 0, humans_failed: 0, bots_verified: 0 });
  await settle();
  assert.match(app.tickerText(), /0 humans tested.*0 failed.*0 bots verified/);

  app.advance();
  assert.equal(app.requests.length, 2);
  app.respond(1, { humans_tested: 10, humans_failed: 8, bots_verified: 2 });
  await settle();
  assert.match(app.tickerText(), /10 humans tested.*8 failed.*2 bots verified/);

  cleanup();
  assert.equal(app.intervals.size, 0);
});

test("failed first load and later failure show unavailable counters", async () => {
  const app = harness();
  app.start();
  app.respond(0, null, false);
  await settle();
  assert.match(app.tickerText(), /— humans tested.*— failed.*— bots verified/);

  app.advance();
  app.respond(1, { humans_tested: 10, humans_failed: 8, bots_verified: 2 });
  await settle();
  assert.match(app.tickerText(), /10 humans tested.*8 failed.*2 bots verified/);

  app.advance();
  app.requests[2].reject(new Error("network error"));
  await settle();
  assert.match(app.tickerText(), /— humans tested.*— failed.*— bots verified/);
});

test("invalid totals never partly update and time alone cannot change displayed totals", async () => {
  const app = harness();
  app.start();
  app.respond(0, { humans_tested: 10, humans_failed: 8, bots_verified: 2 });
  await settle();
  const measured = app.tickerText();

  app.advance();
  assert.equal(app.requests.length, 2);
  assert.equal(app.tickerText(), measured);
  app.respond(1, { humans_tested: 11, humans_failed: null, bots_verified: 3 });
  await settle();
  assert.match(app.tickerText(), /— humans tested.*— failed.*— bots verified/);
});
