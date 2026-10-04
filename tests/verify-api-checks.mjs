import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { testVerifyPage } from "./verify-page-checks.mjs";

const good = JSON.parse(await readFile(new URL("fixtures/receipt.good.json", import.meta.url), "utf8"));
const privateFields = ["agent_id", "provider_id", "cost_microcents", "tool_id", "tool_name"];

// Reuse the database-free production server built by health-build-boundary.test.mjs.
export async function testVerifyApi(t, baseUrl) {
  for (const query of ["", "?receipt_id=", `?receipt_id=${good.receipt_id}`, "?receipt_id=missing"]) {
    await t.test(`GET /api/v1/verify${query} cannot expose stored receipt fields`, async () => {
      const response = await fetch(`${baseUrl}/api/v1/verify${query}`);
      const body = await response.text();
      assert.equal(response.status, 405);
      for (const field of privateFields) {
        assert.ok(!body.includes(field), `GET response must not contain ${field}`);
      }
      // An empty body also prevents values leaking through checked.canonical or aliases.
      assert.equal(body, "");
      assert.equal(response.headers.get("Cache-Control"), "no-store");
    });
  }

  await t.test("HEAD cannot expose a receipt and preflight advertises POST only", async () => {
    const head = await fetch(`${baseUrl}/api/v1/verify?receipt_id=${good.receipt_id}`, { method: "HEAD" });
    assert.equal(head.status, 405);
    assert.equal(await head.text(), "");
    const options = await fetch(`${baseUrl}/api/v1/verify`, {
      method: "OPTIONS",
      headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(options.status, 204);
    assert.equal(options.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(options.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  });

  const cases = [
    ["bare full envelope", good, true, "ok"],
    ["wrapped full envelope", { receipt: good }, true, "ok"],
    ["tampered envelope", { ...good, cost_microcents: good.cost_microcents + 1 }, false, "signature_mismatch"],
    ["receipt ID alone", { receipt_id: good.receipt_id }, false, "missing_fields"],
    ["delimiter collision", { ...good, agent_id: "a|b", provider_id: "c" }, false, "ambiguous_fields"],
  ];
  for (const [name, input, valid, reason] of cases) {
    await t.test(`public POST verifies ${name} without database credentials or authentication`, async () => {
      const response = await fetch(`${baseUrl}/api/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      const body = await response.json();
      assert.deepEqual(body.receipt, input.receipt ?? input);
      assert.equal(body.verification.valid, valid);
      assert.equal(body.verification.reason, reason);
    });
  }

  await testVerifyPage(t, baseUrl);

  await t.test("public POST rejects malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/api/v1/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: true, code: "BAD_REQUEST" });
  });

  await t.test("discovery and verification pages agree on the public POST-only API", async () => {
    const indexResponse = await fetch(`${baseUrl}/api/v1`);
    assert.equal(indexResponse.status, 200);
    const index = await indexResponse.json();
    const endpoints = index.bazaar.trust_layer.endpoints;
    assert.match(endpoints["POST /api/v1/verify"], /signed receipt envelope/);
    assert.equal(endpoints["GET  /api/v1/verify"], undefined);
    assert.doesNotMatch(JSON.stringify(index), /\?receipt_id=/);

    const openapiResponse = await fetch(`${baseUrl}/api/openapi.json`);
    assert.equal(openapiResponse.status, 200);
    const openapi = await openapiResponse.json();
    const verify = openapi.paths["/api/v1/verify"];
    assert.deepEqual(Object.keys(verify), ["post"]);
    assert.deepEqual(verify.post.security, []);
    assert.match(verify.post.description, /No database reads/);
    const outcome = verify.post.responses["200"].content["application/json"].schema.properties.verification;
    assert.ok(outcome.properties.reason.enum.includes("ambiguous_fields"));

    const agentsResponse = await fetch(`${baseUrl}/.well-known/agents.json`);
    assert.equal(agentsResponse.status, 200);
    const { trust: { receipts } } = await agentsResponse.json();
    assert.equal(receipts.verify_endpoint, "https://noui.bot/api/v1/verify");
    assert.equal(receipts.verify_method, "POST");
    assert.match(receipts.verify_description, /No database reads/);

    const pageResponse = await fetch(`${baseUrl}/verify`);
    assert.equal(pageResponse.status, 200);
    const page = await pageResponse.text();
    assert.match(page, /Paste the full signed receipt JSON/);
    assert.doesNotMatch(page, /id="receipt-id"|Look up receipt/);
    const specResponse = await fetch(`${baseUrl}/spec`);
    assert.equal(specResponse.status, 200);
    const spec = await specResponse.text();
    assert.match(spec, /POST \/api\/v1\/verify/);
    assert.match(spec, /HTTP 405 with an empty body/);
  });
}
