import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

process.env.RECEIPT_SIGNING_SECRET = "";
// Node's native TypeScript loader needs the extension that Next's bundler resolves.
const verifierUrl = new URL("../src/lib/receipt-verify.ts", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === verifierUrl && specifier === "./receipts") {
      return nextResolve("./receipts.ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const { verifyReceiptEnvelope } = await import("../src/lib/receipt-verify.ts");
hooks.deregister();

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const good = JSON.parse(await read("fixtures/receipt.good.json"));
const tampered = JSON.parse(await read("fixtures/receipt.tampered.json"));
const canonicalFields = ["receipt_id", "tool_id", "agent_id", "provider_id", "timestamp", "cost_microcents", "status"];

test("good fixture verifies with the exact seven-field canonical string", () => {
  const before = Date.now();
  const result = verifyReceiptEnvelope(good);
  assert.equal(result.valid, true);
  assert.equal(result.reason, "ok");
  assert.deepEqual(result.checked, {
    canonical: canonicalFields.map((field) => good[field]).join("|"),
    algorithm: "HMAC-SHA256",
  });
  assert.equal(new Date(result.verified_at).toISOString(), result.verified_at);
  assert.ok(Date.parse(result.verified_at) >= before && Date.parse(result.verified_at) <= Date.now());
});

test("tampered fixture reports a signature mismatch", () => {
  const result = verifyReceiptEnvelope(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "signature_mismatch");
  assert.equal(result.checked.canonical, canonicalFields.map((field) => tampered[field]).join("|"));
});

const mutations = {
  receipt_id: "rcpt_1123456789abcdef",
  tool_id: `${good.tool_id}-changed`,
  agent_id: `${good.agent_id}-changed`,
  provider_id: `${good.provider_id}-changed`,
  timestamp: new Date(Date.parse(good.timestamp) + 1).toISOString(),
  cost_microcents: good.cost_microcents + 1,
  status: "error",
};
for (const [field, value] of Object.entries(mutations)) {
  test(`changing signed ${field} without resigning invalidates the receipt`, () => {
    const result = verifyReceiptEnvelope({ ...good, [field]: value });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "signature_mismatch");
  });
}

for (const field of [...canonicalFields, "signature"]) {
  test(`missing ${field} is reported without throwing`, () => {
    const receipt = { ...good };
    delete receipt[field];
    const result = verifyReceiptEnvelope(receipt);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "missing_fields");
    assert.deepEqual(result.missing, [field]);
  });

  test(`${field} is not coerced from the wrong type`, () => {
    const value = field === "cost_microcents" ? String(good[field]) : 123;
    const result = verifyReceiptEnvelope({ ...good, [field]: value });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "missing_fields");
    assert.deepEqual(result.missing, [field]);
  });
}

test("cost_microcents must be an integer", () => {
  for (const value of [0.5, null, false, NaN, Infinity, {}, []]) {
    const result = verifyReceiptEnvelope({ ...good, cost_microcents: value });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "missing_fields");
    assert.deepEqual(result.missing, ["cost_microcents"]);
  }
});

test("receipt_id must use the lowercase rcpt_ hex format", () => {
  for (const receipt_id of ["abc", "rcpt_0123456789abcde", "rcpt_0123456789abcdeF"]) {
    const result = verifyReceiptEnvelope({ ...good, receipt_id });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "bad_receipt_id");
  }
  // Longer IDs pass format validation and reach signature comparison.
  assert.equal(verifyReceiptEnvelope({ ...good, receipt_id: `${good.receipt_id}0` }).reason, "signature_mismatch");
});

test("malformed signatures are rejected before timingSafeEqual", () => {
  for (const signature of ["zz", "a".repeat(63), "a".repeat(65), good.signature.toUpperCase()]) {
    const result = verifyReceiptEnvelope({ ...good, signature });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "bad_signature_format");
  }
  assert.equal(verifyReceiptEnvelope({ ...good, signature: "0".repeat(64) }).reason, "signature_mismatch");
});

test("non-object inputs and arrays are invalid without throwing", () => {
  for (const input of [null, "receipt", [], [good], false, 123, undefined]) {
    const result = verifyReceiptEnvelope(input);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "missing_fields");
    assert.deepEqual(result.missing, [...canonicalFields, "signature"]);
    assert.equal(result.checked.canonical, "");
  }
});

test("the public API route does not import authenticateKey", async () => {
  assert.doesNotMatch(await read("../src/app/api/v1/verify/route.ts"), /\bauthenticateKey\b/);
});
