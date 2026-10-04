import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const good = JSON.parse(await readFile(new URL("fixtures/receipt.good.json", import.meta.url), "utf8"));
const tampered = JSON.parse(await readFile(new URL("fixtures/receipt.tampered.json", import.meta.url), "utf8"));
const source = await readFile(new URL("../src/app/verify/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

export async function testVerifyPage(t, baseUrl) {
  for (const [name, input, valid, reason] of [
    ["bare receipt", good, true, "ok"],
    ["wrapped receipt", { receipt: good }, true, "ok"],
    ["double-wrapped receipt", { receipt: { receipt: good } }, false, "missing_fields"],
    ["wrapped tampered receipt", { receipt: tampered }, false, "signature_mismatch"],
  ]) {
    await t.test(`/verify form submits ${name} unchanged to POST`, { timeout: 10_000 }, async () => {
      // Execute the actual component and form handler, with a minimal hook host.
      const state = [];
      let cursor = 0;
      let finish;
      const finished = new Promise((resolve) => { finish = resolve; });
      const requests = [];
      const modules = {
        "react/jsx-runtime": jsxRuntime,
        "next/link": { default: "a" },
        react: {
          useState(initial) {
            const index = cursor++;
            if (!(index in state)) state[index] = initial;
            return [state[index], (value) => {
              state[index] = value;
              if (index === 3 && value === false) finish();
            }];
          },
        },
        "../../../tests/fixtures/receipt.good.json": { default: good },
        "../../../tests/fixtures/receipt.tampered.json": { default: tampered },
      };
      const context = vm.createContext({
        exports: {},
        require(name) {
          assert.ok(name in modules, `Unexpected page import: ${name}`);
          return modules[name];
        },
        fetch(path, options) {
          requests.push({ path, ...options });
          return fetch(`${baseUrl}${path}`, options);
        },
      });
      vm.runInContext(outputText, context);
      const renderForm = () => {
        cursor = 0;
        return context.exports.default().props.children.find((child) => child?.type === "form");
      };
      const textarea = renderForm().props.children.find((child) => child?.type === "textarea");
      textarea.props.onChange({ target: { value: JSON.stringify(input) } });
      let prevented = false;
      renderForm().props.onSubmit({ preventDefault() { prevented = true; } });
      await finished;

      assert.equal(prevented, true);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, "/api/v1/verify");
      assert.equal(requests[0].method, "POST");
      assert.deepEqual(JSON.parse(requests[0].body), input);
      assert.equal(state[2], null, "page must not report a request error");
      assert.equal(state[1].valid, valid);
      assert.equal(state[1].reason, reason);
    });
  }
}
