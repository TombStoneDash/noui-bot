import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { callJsonApi, pathSegment, REQUEST_TIMEOUT_MS } from "../mcp-server/src/http.ts";

const URL_ = "https://noui.bot/api/v1/stats";
const respond = (body, init) => async () => new Response(body, init);

test("a 2xx JSON body becomes a pretty-printed text result", async () => {
  const result = await callJsonApi(URL_, {}, { fetchImpl: respond('{"totals":{"waitlist":3}}', { status: 200 }) });
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(result.content[0].text), { totals: { waitlist: 3 } });
});

test("a non-2xx JSON body is an error result carrying the status and body", async () => {
  const result = await callJsonApi(URL_, { method: "POST" }, {
    fetchImpl: respond('{"error":"Valid email required."}', { status: 422 }),
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /^POST https:\/\/noui\.bot\/api\/v1\/stats returned HTTP 422/);
  assert.match(result.content[0].text, /Valid email required/);
});

test("an HTML error page is an error result, not a JSON parse exception", async () => {
  const html = `<!DOCTYPE html><html><body>${"Bad gateway ".repeat(100)}</body></html>`;
  const result = await callJsonApi(URL_, {}, { fetchImpl: respond(html, { status: 502 }) });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /HTTP 502 with a non-JSON body: <!DOCTYPE html>/);
  assert.ok(result.content[0].text.length < 700, "body snippet is truncated");
});

test("an empty body is an error result", async () => {
  const result = await callJsonApi(URL_, {}, { fetchImpl: respond("", { status: 200 }) });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /HTTP 200 with a non-JSON body$/);
});

test("a network failure is an error result", async () => {
  const result = await callJsonApi(URL_, {}, {
    fetchImpl: async () => { throw new TypeError("fetch failed"); },
  });
  assert.deepEqual(result, { content: [{ type: "text", text: `GET ${URL_} failed: fetch failed` }], isError: true });
});

// AbortSignal.timeout() does not keep the event loop alive (the MCP server's stdio
// does), so fakes that "hang" hold a ref'd timer until the signal fires.
function keepAliveUntilAbort(signal) {
  const timer = setInterval(() => {}, 1_000);
  signal.addEventListener("abort", () => clearInterval(timer));
}

test("a request that never answers times out instead of hanging the tool call", async () => {
  const hang = (_url, init) => new Promise((_resolve, reject) => {
    keepAliveUntilAbort(init.signal);
    init.signal.addEventListener("abort", () => reject(init.signal.reason));
  });
  const result = await callJsonApi(URL_, {}, { fetchImpl: hang, timeoutMs: 20 });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /timed out after 0\.02s/);
});

test("a body that stalls after the headers also times out", async () => {
  const stall = async (_url, init) => {
    keepAliveUntilAbort(init.signal);
    const body = new ReadableStream({
      start(controller) {
        init.signal.addEventListener("abort", () => controller.error(init.signal.reason));
      },
    });
    return new Response(body, { status: 200 });
  };
  const result = await callJsonApi(URL_, {}, { fetchImpl: stall, timeoutMs: 20 });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /timed out/);
});

test("request init is forwarded with a timeout signal", async () => {
  let seen;
  const capture = async (url, init) => { seen = { url, init }; return new Response("{}"); };
  await callJsonApi(URL_, { method: "POST", body: "{}" }, { fetchImpl: capture });
  assert.equal(seen.url, URL_);
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.body, "{}");
  assert.ok(seen.init.signal instanceof AbortSignal);
  assert.equal(REQUEST_TIMEOUT_MS, 30_000);
});

test("path segments cannot climb out of or add a query to their route", () => {
  assert.equal(pathSegment("act_123"), "act_123");
  assert.equal(pathSegment("../stats"), "..%2Fstats");
  assert.equal(pathSegment("x?admin=1#y"), "x%3Fadmin%3D1%23y");
  const url = new URL(`https://shiprail.dev/api/actions/${pathSegment("../../ship")}`);
  assert.equal(url.pathname, "/api/actions/..%2F..%2Fship");
});

test("every MCP tool goes through callJsonApi and deploy_status encodes its ID", async () => {
  const source = await readFile(new URL("../mcp-server/src/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\(/, "no raw fetch calls");
  assert.doesNotMatch(source, /\.json\(\)/, "no unchecked res.json()");
  assert.equal(source.match(/server\.tool\(/g).length, source.match(/return callJsonApi\(/g).length);
  assert.match(source, /\/actions\/\$\{pathSegment\(args\.action_id\)\}/);
  assert.match(source, /\{ timeoutMs: DEPLOY_TIMEOUT_MS \}/);
});
