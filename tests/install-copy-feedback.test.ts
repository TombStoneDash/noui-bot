import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/app/install/page.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function visit(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = visit(child, predicate);
      if (found) return found;
    }
  } else if (node && typeof node === "object") {
    if (predicate(node)) return node;
    return visit(node.props?.children, predicate);
  }
  return undefined;
}

function renderedText(node) {
  if (Array.isArray(node)) return node.map(renderedText).join("");
  if (node && typeof node === "object") return renderedText(node.props?.children);
  return node == null || typeof node === "boolean" ? "" : String(node);
}

function mountCopyButton(navigatorMock) {
  const states = [];
  const timers = [];
  let hookIndex = 0;
  const react = {
    useState(initial) {
      const index = hookIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = value; }];
    },
    useCallback(callback) { return callback; },
  };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const module = { exports: {} };
  runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: Symbol.for("react.fragment") };
      throw new Error(`Unexpected import: ${id}`);
    },
    navigator: navigatorMock,
    setTimeout(callback, delay) { timers.push({ callback, delay }); },
  });

  // Get the actual CopyButton component and its supplied snippet from the page tree.
  const page = module.exports.default();
  const copyElement = visit(page, (node) => typeof node.type === "function" && node.type.name === "CopyButton");
  assert.ok(copyElement);
  states.length = 0;

  function render() {
    hookIndex = 0;
    const tree = copyElement.type(copyElement.props);
    const button = visit(tree, (node) => node.type === "button");
    const alert = visit(tree, (node) => node.props?.role === "alert");
    assert.ok(button);
    return { button, alert };
  }

  return {
    text: copyElement.props.text,
    timers,
    render,
    click() { return render().button.props.onClick(); },
  };
}

function assertManualCopyFeedback(view) {
  assert.equal(renderedText(view.button), "Copy");
  assert.ok(view.alert, "failure feedback should be rendered");
  assert.match(renderedText(view.alert), /select and copy the visible snippet manually/i);
}

test("clipboard unavailable shows manual copy feedback", async () => {
  const app = mountCopyButton({});
  await app.click();
  assertManualCopyFeedback(app.render());
  assert.equal(app.timers.length, 0);
});

test("synchronous clipboard failure shows manual copy feedback", async () => {
  const app = mountCopyButton({ clipboard: { writeText() { throw new Error("denied"); } } });
  await app.click();
  assertManualCopyFeedback(app.render());
  assert.equal(app.timers.length, 0);
});

test("rejected clipboard write shows manual copy feedback", async () => {
  const app = mountCopyButton({ clipboard: { writeText() { return Promise.reject(new Error("denied")); } } });
  await app.click();
  assertManualCopyFeedback(app.render());
  assert.equal(app.timers.length, 0);
});

test("successful write copies the supplied snippet and resets the label", async () => {
  const writes = [];
  let resolveWrite;
  const app = mountCopyButton({ clipboard: { writeText(text) {
    writes.push(text);
    return new Promise((resolve) => { resolveWrite = resolve; });
  } } });

  const attempt = app.click();
  assert.equal(renderedText(app.render().button), "Copy", "pending writes must not report success");
  resolveWrite();
  await attempt;

  assert.deepEqual(writes, [app.text]);
  assert.equal(renderedText(app.render().button), "✓ Copied");
  assert.equal(app.render().alert, undefined);
  assert.equal(app.timers.length, 1);
  assert.equal(app.timers[0].delay, 2000);
  app.timers[0].callback();
  assert.equal(renderedText(app.render().button), "Copy");
});

test("successful retry clears earlier failure feedback", async () => {
  const writes = [];
  let fail = true;
  const app = mountCopyButton({ clipboard: { writeText(text) {
    writes.push(text);
    return fail ? Promise.reject(new Error("denied")) : Promise.resolve();
  } } });

  await app.click();
  assertManualCopyFeedback(app.render());
  fail = false;
  await app.click();

  assert.deepEqual(writes, [app.text, app.text]);
  assert.equal(renderedText(app.render().button), "✓ Copied");
  assert.equal(app.render().alert, undefined);
});
