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
const source = await readFile(new URL("../src/app/providers/[id]/page.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function tool(id, providerId = "selected") {
  return {
    id, tool_name: id, display_name: `Tool ${id}`, description: "A catalog tool", category: "data",
    provider: { id: providerId, name: `${providerId} Labs`, verified: true },
    pricing: { model: "per_call", price_cents: 0, price: "Free", free_tier_calls: 5 },
    stats: { total_calls: 10, avg_latency_ms: 20, uptime_pct: 99 },
  };
}
const fullPage = () => Array.from({ length: 50 }, (_, i) => tool(`other-${i}`, "other"));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function loadPage(id = "selected") {
  const state = [];
  const requests = [];
  let cursor = 0;
  let previousId;
  let pendingEffect;
  let cleanup;
  let updates = 0;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    AbortController,
    // Deliberately allow aborted requests to resolve, to test the stale-result guard.
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    },
    require(name) {
      if (name === "react") return {
        use: (params) => params,
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [state[index], (value) => { updates++; state[index] = value; }];
        },
        useEffect(effect, [nextId]) {
          if (previousId !== nextId) {
            previousId = nextId;
            pendingEffect = effect;
          }
        },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name === "next/link") return { default: "a" };
      throw new Error(`Unexpected import: ${name}`);
    },
  }, { filename: "providers/[id]/page.js" });

  function render() {
    cursor = 0;
    const tree = exports.default({ params: { id } });
    if (pendingEffect) {
      cleanup?.();
      const effect = pendingEffect;
      pendingEffect = undefined;
      cleanup = effect();
      return render();
    }
    const text = [];
    const cards = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === "object") {
        if (typeof node.type === "function" && node.props.tool) cards.push(node.props.tool);
        walk(node.props?.children);
      } else if (typeof node === "string" || typeof node === "number") text.push(String(node));
    }
    walk(tree);
    return { text: text.join(" "), cards };
  }
  render();
  return {
    requests, render,
    get updates() { return updates; },
    changeId(nextId) { id = nextId; return render(); },
    unmount() { cleanup?.(); },
    async respond(index, tools, limit = 50) {
      assert.ok(requests[index], `Expected request ${index}`);
      requests[index].resolve({ ok: true, json: async () => ({ tools, total: tools.length, limit }) });
      await flush();
    },
  };
}

function assertRequests(page, offsets) {
  assert.deepEqual(page.requests.map(({ url }) => {
    const parsed = new URL(url, "https://example.test");
    assert.equal(parsed.pathname, "/api/bazaar/catalog");
    assert.equal(parsed.searchParams.get("limit"), "50");
    return Number(parsed.searchParams.get("offset"));
  }), offsets);
}
function assertLoading(page) {
  const view = page.render();
  assert.match(view.text, /Loading provider/);
  assert.doesNotMatch(view.text, /Provider not found/);
  assert.equal(view.cards.length, 0);
}
function assertTools(page, expected) {
  const view = page.render();
  assert.deepEqual(view.cards.map((entry) => entry.id), expected);
  assert.match(view.text, /selected Labs/);
  assert.match(view.text, /verified/);
  assert.doesNotMatch(view.text, /Loading provider|Provider not found|Unable to load provider/);
  return view;
}

test("finds a provider first appearing on page two despite page-count total", async () => {
  const page = loadPage();
  assertLoading(page);
  await page.respond(0, fullPage());
  assertLoading(page);
  await page.respond(1, [tool("later")]);
  assertRequests(page, [0, 50]);
  const view = assertTools(page, ["later"]);
  assert.equal(view.cards[0].pricing.price, "Free");
  assert.match(view.text, /10 total calls/);
});

test("collects the selected provider's tools across all pages", async () => {
  const page = loadPage();
  const first = fullPage();
  first[4] = tool("first");
  await page.respond(0, first);
  assertLoading(page);
  await page.respond(1, [tool("second"), tool("unrelated", "other"), tool("third")]);
  assertRequests(page, [0, 50]);
  const view = assertTools(page, ["first", "second", "third"]);
  assert.match(view.text, /3 tools/);
  assert.match(view.text, /30 total calls/);
});

test("requests an empty page after an exact-full final page", async () => {
  const page = loadPage();
  await page.respond(0, fullPage());
  const last = fullPage();
  last[49] = tool("last");
  await page.respond(1, last);
  assertLoading(page);
  await page.respond(2, []);
  assertRequests(page, [0, 50, 100]);
  assertTools(page, ["last"]);
});

for (const finalPage of [[], [tool("absent", "other")]]) {
  test(`declares genuine absence only after a ${finalPage.length ? "short" : "empty"} final page`, async () => {
    const page = loadPage();
    await page.respond(0, fullPage());
    assertLoading(page);
    await page.respond(1, finalPage);
    assertRequests(page, [0, 50]);
    assert.match(page.render().text, /Provider not found/);
    assert.equal(page.render().cards.length, 0);
  });
}

test("uses the effective response limit for termination and offsets", async () => {
  const page = loadPage();
  await page.respond(0, [tool("other-1", "other"), tool("first")], 2);
  assertLoading(page);
  await page.respond(1, [tool("second")], 2);
  assertRequests(page, [0, 2]);
  assertTools(page, ["first", "second"]);
});

for (const failure of ["http", "network", "json", "invalid body"]) {
  test(`stops on ${failure} errors without publishing partial tools or declaring absence`, async () => {
    const page = loadPage();
    const first = fullPage();
    first[0] = tool("partial");
    await page.respond(0, first);
    const request = page.requests[1];
    if (failure === "network") request.reject(new Error("offline"));
    else request.resolve({
      ok: failure !== "http",
      async json() {
        if (failure === "json") throw new Error("invalid JSON");
        return { error: true };
      },
    });
    await flush();
    assertRequests(page, [0, 50]);
    const view = page.render();
    assert.match(view.text, /Unable to load provider/);
    assert.doesNotMatch(view.text, /Loading provider|Provider not found/);
    assert.equal(view.cards.length, 0);
  });
}

for (const staleResult of ["success", "error"]) {
  test(`ignores stale ${staleResult} after the provider ID changes`, async () => {
    const page = loadPage("old");
    await page.respond(0, fullPage());
    page.changeId("selected");
    assert.equal(page.requests[1].options.signal.aborted, true);
    assertLoading(page);
    await page.respond(2, [tool("current")]);
    const updates = page.updates;
    if (staleResult === "success") await page.respond(1, Array.from({ length: 50 }, (_, i) => tool(`old-${i}`, "old")));
    else {
      page.requests[1].reject(new Error("late error"));
      await flush();
    }
    assert.equal(page.updates, updates, "Obsolete requests must not publish any state");
    assertRequests(page, [0, 50, 0]);
    assertTools(page, ["current"]);
  });
}

test("resets absence and metadata when navigating between providers", async () => {
  const page = loadPage("missing");
  await page.respond(0, []);
  assert.match(page.render().text, /Provider not found/);
  page.changeId("selected");
  assertLoading(page);
  await page.respond(1, [tool("current")]);
  assertTools(page, ["current"]);
  page.changeId("next");
  assertLoading(page);
  const next = tool("next-tool", "next");
  next.provider.verified = false;
  await page.respond(2, [next]);
  const view = page.render();
  assert.match(view.text, /next Labs/);
  assert.doesNotMatch(view.text, /selected Labs|verified/);
  assert.deepEqual(view.cards.map((entry) => entry.id), ["next-tool"]);
});

test("unmount aborts the request and suppresses late state updates", async () => {
  const page = loadPage();
  page.unmount();
  assert.equal(page.requests[0].options.signal.aborted, true);
  const updates = page.updates;
  await page.respond(0, fullPage());
  assert.equal(page.updates, updates);
  assertRequests(page, [0]);
});
