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

const source = await readFile(new URL("../src/components/WaitlistForm.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "WaitlistForm.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function findNode(tree, type) {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findNode(child, type);
      if (found) return found;
    }
  } else if (tree && typeof tree === "object") {
    if (tree.type === type) return tree;
    return findNode(tree.props?.children, type);
  }
  return undefined;
}

function makeForm(fetchStub) {
  const state = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    fetch: fetchStub,
    require(name) {
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => { state[index] = value; }];
        },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  const render = () => {
    cursor = 0;
    return context.exports.WaitlistForm();
  };
  render.emailValue = () => state[0];
  return render;
}

const email = "person@example.com";

async function submitWith(fetchStub) {
  const render = makeForm(fetchStub);
  const initial = render();
  findNode(initial, "input").props.onChange({ target: { value: email } });
  const filled = render();
  let prevented = false;
  await filled.props.onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  return { tree: render(), emailValue: render.emailValue() };
}

function assertRetryable(tree, expectedMessage) {
  assert.equal(tree.type, "form");
  const message = findNode(tree, "p")?.props.children;
  assert.equal(typeof message, "string", "error text must be a string");
  assert.equal(message, expectedMessage);
  assert.equal(findNode(tree, "input").props.value, email);
  const button = findNode(tree, "button");
  assert.equal(button.props.disabled, false);
  assert.equal(button.props.children, "Join");
}

for (const { name, body, expected } of [
  { name: "boolean error with message", body: { error: true, message: "Try again in 60 seconds." }, expected: "Try again in 60 seconds." },
  { name: "string error", body: { error: "Address rejected." }, expected: "Address rejected." },
  { name: "object error", body: { error: { reason: "private" } }, expected: "Something went wrong." },
  { name: "array error", body: { error: ["private"] }, expected: "Something went wrong." },
  { name: "null body", body: null, expected: "Something went wrong." },
  { name: "missing message", body: { error: true }, expected: "Something went wrong." },
  { name: "empty message with string error", body: { message: "  ", error: "Please retry." }, expected: "Please retry." },
]) {
  test(name, async () => {
    const { tree, emailValue } = await submitWith(async () => ({ ok: false, status: 429, json: async () => body }));
    assertRetryable(tree, expected);
    assert.equal(emailValue, email);
  });
}

test("network rejection shows a readable error and allows retry", async () => {
  const { tree, emailValue } = await submitWith(async () => { throw new Error("offline"); });
  assertRetryable(tree, "Connection failed. Try again.");
  assert.equal(emailValue, email);
});

test("successful signup shows the existing confirmation and clears the email", async () => {
  const requests = [];
  const { tree, emailValue } = await submitWith(async (...args) => {
    requests.push(args);
    return { ok: true, json: async () => ({}) };
  });
  assert.equal(tree.type, "div");
  assert.equal(tree.props.children, "You're in. We'll be in touch.");
  assert.equal(emailValue, "");
  assert.equal(findNode(tree, "form"), undefined);
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], "/api/v1/waitlist");
  assert.equal(requests[0][1].method, "POST");
  assert.deepEqual(JSON.parse(requests[0][1].body), { email });
});
