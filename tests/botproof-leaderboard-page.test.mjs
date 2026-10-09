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

const source = await readFile(new URL("../src/app/bot-captcha/leaderboard/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function loadPage(getLeaderboard) {
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "@/lib/botproof-store") return { getLeaderboard };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(outputText, context);
  return context.exports.default;
}

function walk(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
  } else if (node && typeof node === "object") {
    visit(node);
    walk(node.props?.children, visit);
  }
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object") return textContent(node.props?.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

function dataRows(tree) {
  const rows = [];
  walk(tree, (node) => {
    if (node.type === "div" && node.props?.className?.includes("items-center px-5 py-3 text-[12px]")) {
      rows.push(node);
    }
  });
  return rows;
}

function stats(tree) {
  const values = [];
  walk(tree, (node) => {
    if (node.type === "div" && node.props?.className?.includes("grid grid-cols-3 gap-px mt-5")) {
      values.push(...node.props.children.map((cell) => textContent(cell.props.children[1])));
    }
  });
  return values;
}

test("empty result shows an honest empty state and no ranking", async () => {
  const calls = [];
  const page = loadPage(async (limit) => { calls.push(limit); return []; });
  const tree = await page();
  assert.deepEqual(calls, [20]);
  assert.equal(dataRows(tree).length, 0);
  assert.match(textContent(tree), /No verified bots yet\. Be the first to pass BotProof\./);
  assert.doesNotMatch(textContent(tree), /temporarily unavailable|Daisy|Sentinel/);
  assert.deepEqual(stats(tree), ["—", "0", "—"]);
});

test("failed load shows unavailable state without claiming zero verifications", async () => {
  const page = loadPage(async () => { throw new Error("database unavailable"); });
  const tree = await page();
  assert.equal(dataRows(tree).length, 0);
  assert.match(textContent(tree), /Leaderboard temporarily unavailable\. Please try again later\./);
  assert.doesNotMatch(textContent(tree), /No verified bots yet|Daisy|Sentinel/);
  assert.deepEqual(stats(tree), ["—", "—", "—"]);
});

test("populated result renders only stored rows in actual response-time order", async () => {
  const recorded = [
    { agent_name: "Slow Fixture", model: "test-model-b", level: 1, response_time_ms: 1250,
      challenge_type: "arithmetic", verified_at: "2026-10-08T12:00:00Z" },
    { agent_name: "Fast Fixture", model: "test-model-a", level: 1, response_time_ms: 23,
      challenge_type: "hash_sha256", verified_at: "2026-10-07T12:00:00Z" },
  ];
  const page = loadPage(async () => recorded);
  const tree = await page();
  const rows = dataRows(tree).map(textContent);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /^1Fast Fixturetest-model-aSHA-256Oct 7, 202623ms$/);
  assert.match(rows[1], /^2Slow Fixturetest-model-bMATHOct 8, 20261\.25s$/);
  assert.deepEqual(stats(tree), ["23ms", "2", "637ms"]);
  assert.doesNotMatch(textContent(tree), /Daisy|Sentinel|No verified bots yet|temporarily unavailable/);
  assert.deepEqual(recorded.map((entry) => entry.agent_name), ["Slow Fixture", "Fast Fixture"]);
});
