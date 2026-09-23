import { test } from "node:test";
import assert from "node:assert/strict";
import { Bazaar, BazaarError } from "../src/index.ts";

function client(body, init) {
  return new Bazaar({
    apiKey: "bz_test",
    fetch: async () => new Response(body, init),
  });
}

function json(data, status = 200) {
  return client(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("{error: true, message} body surfaces the server message, status and code", async () => {
  const bz = json({ error: true, code: "UNAUTHORIZED", message: "Invalid API key", details: { hint: "x" } }, 401);
  await assert.rejects(bz.balance.get(), (err) => {
    assert.ok(err instanceof BazaarError);
    assert.equal(err.message, "Invalid API key");
    assert.equal(err.status, 401);
    assert.equal(err.code, "UNAUTHORIZED");
    assert.deepEqual(err.details, { hint: "x" });
    return true;
  });
});

test("string error body still works", async () => {
  const bz = json({ error: "Insufficient balance", code: "INSUFFICIENT_BALANCE" }, 402);
  await assert.rejects(bz.tools.call("echo"), (err) => {
    assert.ok(err instanceof BazaarError);
    assert.equal(err.message, "Insufficient balance");
    assert.equal(err.status, 402);
    assert.equal(err.code, "INSUFFICIENT_BALANCE");
    return true;
  });
});

test("HTML 502 body keeps the real HTTP status", async () => {
  const bz = client("<html><body>Bad Gateway</body></html>", {
    status: 502,
    headers: { "Content-Type": "text/html" },
  });
  await assert.rejects(bz.balance.get(), (err) => {
    assert.ok(err instanceof BazaarError);
    assert.equal(err.status, 502);
    assert.equal(err.message, "HTTP 502");
    return true;
  });
});

test("non-JSON body on an ok response throws INVALID_RESPONSE with the real status", async () => {
  const bz = client("<html>ok</html>", { status: 200 });
  await assert.rejects(bz.balance.get(), (err) => {
    assert.ok(err instanceof BazaarError);
    assert.equal(err.status, 200);
    assert.equal(err.code, "INVALID_RESPONSE");
    return true;
  });
});

test("successful JSON still returns data", async () => {
  const bz = json({ balance_cents: 1234 });
  assert.deepEqual(await bz.balance.get(), { balance_cents: 1234 });
});
