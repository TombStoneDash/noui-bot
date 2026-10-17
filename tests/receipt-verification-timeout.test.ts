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

const source = await readFile(new URL("../src/app/verify/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
const good = JSON.parse(await readFile(new URL("fixtures/receipt.good.json", import.meta.url), "utf8"));
const tampered = JSON.parse(await readFile(new URL("fixtures/receipt.tampered.json", import.meta.url), "utf8"));
const verification = (valid) => ({
  valid,
  reason: valid ? "ok" : "signature_mismatch",
  checked: { canonical: "receipt", algorithm: "HMAC-SHA256" },
  verified_at: "2026-10-09T00:00:00Z",
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function harness(fetchMock) {
  const state = [];
  const refs = [];
  const timers = new Map();
  const scheduled = [];
  const cleared = [];
  const controllers = [];
  let cursor = 0;
  let refCursor = 0;
  let nextTimer = 0;
  let now = 0;
  const jsx = (type, props) => ({ type, props });
  class MockAbortController {
    signal = { aborted: false };
    constructor() { controllers.push(this); }
    abort() { this.signal.aborted = true; }
  }
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "a" },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value) => { state[index] = value; }];
      },
      useRef(initial) {
        const index = refCursor++;
        if (!(index in refs)) refs[index] = { current: initial };
        return refs[index];
      },
    },
    "../../../tests/fixtures/receipt.good.json": { default: good },
    "../../../tests/fixtures/receipt.tampered.json": { default: tampered },
  };
  const context = vm.createContext({
    exports: {},
    Error,
    AbortController: MockAbortController,
    require(name) {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
    fetch: fetchMock,
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      scheduled.push({ id, delay });
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) {
      cleared.push(id);
      timers.delete(id);
    },
  });
  vm.runInContext(outputText, context);
  function render() {
    cursor = 0;
    refCursor = 0;
    return context.exports.default();
  }
  function find(node, predicate) {
    if (node == null || typeof node !== "object") return undefined;
    if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  function view() {
    const root = render();
    const form = find(root, (node) => node.type === "form");
    const textarea = find(form, (node) => node.type === "textarea");
    const buttons = [];
    function collect(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(collect);
      if (node.type === "button") buttons.push(node);
      collect(node.props?.children);
    }
    collect(form);
    return {
      form, textarea, buttons,
      alert: find(root, (node) => node.props?.role === "alert")?.props.children,
      progress: find(root, (node) => node.type === "p" && node.props?.children === "Verifying receipt..."),
      result: find(root, (node) => node.type === "h2")?.props.children,
    };
  }
  function submit() {
    view().form.props.onSubmit({ preventDefault() {} });
  }
  function advance(ms) {
    now += ms;
    for (const [id, timer] of timers) {
      if (timer.due <= now) {
        timers.delete(id);
        timer.callback();
      }
    }
  }
  return { view, submit, advance, controllers, timers, scheduled, cleared, state };
}

async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

function assertControls(page, disabled) {
  const { textarea, buttons } = page.view();
  assert.equal(textarea.props.disabled, disabled);
  assert.equal(buttons.length, 2);
  for (const button of buttons) assert.equal(button.props.disabled, disabled);
}

test("stalled request times out, aborts, and restores the form", async () => {
  const pending = deferred();
  const page = harness((_url, options) => {
    assert.equal(options.signal, page.controllers[0].signal);
    return pending.promise;
  });
  page.submit();
  assertControls(page, true);
  assert.ok(page.view().progress);
  assert.deepEqual(page.scheduled.map(({ delay }) => delay), [10_000]);
  page.advance(9_999);
  await settle();
  assertControls(page, true);
  page.advance(1);
  await settle();
  assert.equal(page.controllers[0].signal.aborted, true);
  assert.match(page.view().alert, /timed out.*try again/i);
  assert.equal(page.view().progress, undefined);
  assertControls(page, false);
  assert.equal(page.timers.size, 0);
});

test("deadline also covers a stalled response body", async () => {
  const body = deferred();
  const page = harness(async () => ({ ok: true, json: () => body.promise }));
  page.submit();
  await settle();
  assertControls(page, true);
  page.advance(10_000);
  await settle();
  assert.equal(page.controllers[0].signal.aborted, true);
  assert.match(page.view().alert, /timed out.*try again/i);
  assertControls(page, false);
});

test("success before the deadline clears the timer and keeps the result", async () => {
  const response = deferred();
  const page = harness(() => response.promise);
  page.submit();
  page.advance(9_999);
  response.resolve({ ok: true, json: async () => ({ verification: verification(true) }) });
  await settle();
  assert.equal(page.view().result, "VALID");
  assert.equal(page.view().alert, undefined);
  assertControls(page, false);
  assert.equal(page.timers.size, 0);
  assert.deepEqual(page.cleared, [1]);
  page.advance(1);
  assert.equal(page.controllers[0].signal.aborted, false);
});

test("late completion cannot replace a timeout or a successful retry", async () => {
  const first = deferred();
  const second = deferred();
  const responses = [first.promise, second.promise];
  const page = harness(() => responses.shift());
  page.submit();
  page.advance(10_000);
  await settle();
  assert.match(page.view().alert, /timed out.*try again/i);
  assertControls(page, false);
  page.submit();
  assertControls(page, true);
  first.resolve({ ok: true, json: async () => ({ verification: verification(false) }) });
  await settle();
  assert.equal(page.view().result, undefined);
  assert.equal(page.view().alert, undefined);
  assertControls(page, true);
  second.resolve({ ok: true, json: async () => ({ verification: verification(true) }) });
  await settle();
  assert.equal(page.view().result, "VALID");
  assert.equal(page.view().alert, undefined);
  assertControls(page, false);
  assert.equal(page.controllers[1].signal.aborted, false);
});

test("invalid, malformed JSON, and server errors retain their feedback", async () => {
  const responses = [
    { ok: true, json: async () => ({ verification: verification(false) }) },
    { ok: false, json: async () => ({ message: "Server unavailable" }) },
  ];
  const page = harness(async () => responses.shift());
  page.submit();
  await settle();
  assert.equal(page.view().result, "INVALID");
  assertControls(page, false);
  page.view().textarea.props.onChange({ target: { value: "{" } });
  page.submit();
  assert.match(page.view().alert, /Enter valid JSON/);
  assertControls(page, false);
  page.view().textarea.props.onChange({ target: { value: JSON.stringify(good) } });
  page.submit();
  await settle();
  assert.equal(page.view().alert, "Server unavailable");
  assertControls(page, false);
});
