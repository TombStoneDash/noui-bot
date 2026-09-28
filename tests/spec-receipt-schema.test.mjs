import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.RECEIPT_SIGNING_SECRET = "";
const { signReceipt, verifyReceipt } = await import("../src/lib/receipts.ts");
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const goodText = await read("fixtures/receipt.good.json");
const good = JSON.parse(goodText);
const tampered = JSON.parse(await read("fixtures/receipt.tampered.json"));
const spec = await read("../SPEC.md");

test("golden receipt matches the real signer and verifies", () => {
  assert.equal(signReceipt(good), good.signature);
  assert.equal(verifyReceipt(good), true);
});

test("changing the billed amount without resigning fails verification", () => {
  assert.deepEqual(tampered, { ...good, cost_microcents: 0 });
  assert.notEqual(tampered.cost_microcents, good.cost_microcents);
  assert.equal(verifyReceipt(tampered), false);
});

test("fixtures have the documented receipt shape", () => {
  for (const receipt of [good, tampered]) {
    for (const key of ["receipt_id", "tool_id", "agent_id", "provider_id", "timestamp", "cost_microcents", "status", "signature", "verify_url"]) {
      assert.ok(Object.hasOwn(receipt, key), `missing ${key}`);
    }
    for (const key of ["tool_id", "agent_id", "provider_id", "verify_url"]) {
      assert.equal(typeof receipt[key], "string", key);
    }
    assert.match(receipt.receipt_id, /^rcpt_[0-9a-f]{16}$/);
    assert.match(receipt.signature, /^[0-9a-f]{64}$/);
    assert.equal(new Date(receipt.timestamp).toISOString(), receipt.timestamp);
    assert.ok(Number.isInteger(receipt.cost_microcents) && receipt.cost_microcents >= 0);
    assert.ok(["success", "error", "timeout", "rate_limited"].includes(receipt.status));
    assert.equal(receipt.verify_url, `https://noui.bot/api/v1/bazaar/receipts/${receipt.receipt_id}`);
    if (receipt.tool_name != null) assert.equal(typeof receipt.tool_name, "string");
    if (receipt.duration_ms != null) assert.ok(Number.isInteger(receipt.duration_ms));
    for (const key of ["input_hash", "output_hash"]) {
      if (receipt[key] != null) assert.equal(typeof receipt[key], "string");
    }
  }
});

test("spec example is the golden fixture, including its exact bytes", () => {
  const example = spec.match(/^### Example receipt\r?\n(?:(?!^## ).)*?^```json\r?\n([\s\S]*?)^```/ms);
  assert.ok(example, "Example receipt JSON block is missing");
  assert.deepEqual(JSON.parse(example[1]), good);
  assert.equal(example[1], goodText);
});

test("spec canonical field order matches the signer's join array", async () => {
  const source = await read("../src/lib/receipts.ts");
  const array = source.match(/const canonical\s*=\s*\[([\s\S]*?)\]\.join\("\|"\)/);
  assert.ok(array, "canonical join array is missing");
  const actualFields = array[1].split(",").map((field) => field.trim()).filter(Boolean).map((field) => {
    const match = field.match(/^params\.(\w+)(?:\.toString\(\))?$/);
    assert.ok(match, `unrecognized canonical field: ${field}`);
    return match[1];
  });
  const section = spec.match(/^## SS3 Signed receipt\r?\n([\s\S]*?)(?=^## SS4 )/m);
  assert.ok(section, "SS3 is missing");
  const canonical = section[1].match(/^Canonical string: `([a-z_]+(?:\|[a-z_]+)+)`$/m);
  assert.ok(canonical, "spec canonical string is missing");
  assert.deepEqual(actualFields, canonical[1].split("|"));
});
