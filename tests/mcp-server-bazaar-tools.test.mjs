import assert from "node:assert/strict";
import test from "node:test";
import { createBazaarHandlers, registerBazaarTools } from "../mcp-server/src/bazaar.ts";

const KEY = "bz_test_key";
const TOOL_ID = "33333333-3333-4333-8333-333333333333";

function recorder(respond = () => new Response("{}")) {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return respond(url, init); };
  return { calls, fetchImpl };
}

test("bazaar_call_tool posts tool_id and arguments to the proxy with the consumer key", async () => {
  const { calls, fetchImpl } = recorder(() => Response.json({ result: { content: [{ type: "text", text: "21C" }] }, meta: { cost_cents: 5 } }));
  const result = await createBazaarHandlers({ apiKey: KEY, fetchImpl }).callTool({
    tool_id: TOOL_ID, arguments: { city: "Paris" }, idempotency_key: "order-1",
  });
  assert.equal(result.isError, undefined);
  assert.equal(JSON.parse(result.content[0].text).meta.cost_cents, 5);
  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, "https://noui.bot/api/bazaar/proxy");
  assert.equal(init.method, "POST");
  assert.deepEqual(init.headers, { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "Idempotency-Key": "order-1" });
  assert.deepEqual(JSON.parse(init.body), { tool_id: TOOL_ID, input: { city: "Paris" } });
  assert.ok(init.signal instanceof AbortSignal);
});

test("bazaar_call_tool falls back to tool_name and an empty input object", async () => {
  const { calls, fetchImpl } = recorder();
  await createBazaarHandlers({ apiKey: KEY, fetchImpl }).callTool({ tool_name: "weather.forecast" });
  assert.deepEqual(JSON.parse(calls[0].init.body), { tool_name: "weather.forecast", input: {} });
  assert.equal(calls[0].init.headers["Idempotency-Key"], undefined);
});

test("calls that need a key fail readably, without a request, when NOUI_API_KEY is unset", async () => {
  for (const apiKey of [undefined, "", "   "]) {
    const { calls, fetchImpl } = recorder();
    const handlers = createBazaarHandlers({ apiKey, fetchImpl });
    for (const result of [await handlers.callTool({ tool_id: TOOL_ID }), await handlers.balance()]) {
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /NOUI_API_KEY is not set/);
    }
    assert.equal(calls.length, 0);
  }
});

test("bazaar_call_tool without tool_id or tool_name is rejected before any request", async () => {
  const { calls, fetchImpl } = recorder();
  const result = await createBazaarHandlers({ apiKey: KEY, fetchImpl }).callTool({ arguments: { a: 1 } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /tool_id/);
  assert.equal(calls.length, 0);
});

test("proxy errors such as 402 come back as error results carrying the API body", async () => {
  const { fetchImpl } = recorder(() => Response.json(
    { error: true, code: "INSUFFICIENT_FUNDS", message: "Insufficient balance. Cost: $5.0000, Balance: $1.00" },
    { status: 402 },
  ));
  const result = await createBazaarHandlers({ apiKey: KEY, fetchImpl }).callTool({ tool_id: TOOL_ID });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /^POST \/api\/bazaar\/proxy returned HTTP 402:/);
  assert.match(result.content[0].text, /INSUFFICIENT_FUNDS/);
});

test("network failures, timeouts and HTML bodies are error results, not exceptions", async () => {
  const failing = createBazaarHandlers({ apiKey: KEY, fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  assert.deepEqual(await failing.balance(), {
    content: [{ type: "text", text: "GET /api/v1/bazaar/balance failed: fetch failed" }], isError: true,
  });

  const hanging = createBazaarHandlers({
    apiKey: KEY,
    timeoutMs: 20,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      const keepAlive = setInterval(() => {}, 1_000);
      init.signal.addEventListener("abort", () => { clearInterval(keepAlive); reject(init.signal.reason); });
    }),
  });
  const timedOut = await hanging.callTool({ tool_id: TOOL_ID });
  assert.equal(timedOut.isError, true);
  assert.match(timedOut.content[0].text, /timed out after 0\.02s/);

  const html = createBazaarHandlers({ fetchImpl: async () => new Response("<html>Bad gateway</html>", { status: 502 }) });
  const listed = await html.listTools({});
  assert.equal(listed.isError, true);
  assert.match(listed.content[0].text, /^GET \/api\/bazaar\/catalog returned HTTP 502 with a non-JSON body: <html>/);
});

test("bazaar_list_tools is public and forwards only the filters given", async () => {
  const { calls, fetchImpl } = recorder(() => Response.json({ tools: [], total: 0 }));
  const handlers = createBazaarHandlers({ fetchImpl });
  await handlers.listTools({});
  await handlers.listTools({ category: "weather", limit: 100, offset: 0 });
  assert.deepEqual(calls.map((c) => c.url), [
    "https://noui.bot/api/bazaar/catalog",
    "https://noui.bot/api/bazaar/catalog?category=weather&limit=100&offset=0",
  ]);
  assert.ok(calls.every((c) => c.init.headers === undefined), "no key sent to the public catalog");
});

test("bazaar_balance reads the consumer balance route with the key", async () => {
  const { calls, fetchImpl } = recorder(() => Response.json({ balance_cents: 500 }));
  const result = await createBazaarHandlers({ apiKey: KEY, fetchImpl }).balance();
  assert.equal(JSON.parse(result.content[0].text).balance_cents, 500);
  assert.equal(calls[0].url, "https://noui.bot/api/v1/bazaar/balance");
  assert.deepEqual(calls[0].init.headers, { Authorization: `Bearer ${KEY}` });
});

test("registerBazaarTools exposes the three tools, keyed by NOUI_API_KEY by default", async () => {
  const registered = new Map();
  const server = { tool(name, description, schema, handler) { registered.set(name, { description, schema, handler }); } };
  const saved = process.env.NOUI_API_KEY;
  delete process.env.NOUI_API_KEY;
  try {
    registerBazaarTools(server);
  } finally {
    if (saved !== undefined) process.env.NOUI_API_KEY = saved;
  }
  assert.deepEqual([...registered.keys()], ["bazaar_list_tools", "bazaar_call_tool", "bazaar_balance"]);
  assert.deepEqual(Object.keys(registered.get("bazaar_call_tool").schema), ["tool_id", "tool_name", "arguments", "idempotency_key"]);
  assert.equal(registered.get("bazaar_call_tool").schema.idempotency_key.safeParse("x".repeat(129)).success, false);
  const result = await registered.get("bazaar_call_tool").handler({ tool_id: TOOL_ID });
  assert.match(result.content[0].text, /NOUI_API_KEY is not set/);
});
