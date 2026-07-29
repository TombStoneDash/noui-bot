import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specRoot = path.join(root, "public", "specs", "mcp-billing-v1");
const fixtureRoot = path.join(specRoot, "fixtures");
const fixtureSigningKey = "noui-spec-fixture-secret-v1";

const artifacts = [
  {
    name: "billing envelope",
    schemaPath: path.join(specRoot, "billing-envelope.schema.json"),
    fixturePath: path.join(fixtureRoot, "billing-envelope.fixture.json"),
  },
  {
    name: "meter event",
    schemaPath: path.join(specRoot, "meter-event.schema.json"),
    fixturePath: path.join(fixtureRoot, "meter-event.fixture.json"),
  },
  {
    name: "receipt",
    schemaPath: path.join(specRoot, "receipt.schema.json"),
    fixturePath: path.join(fixtureRoot, "receipt.fixture.json"),
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true,
  schemaId: "auto",
});

for (const artifact of artifacts) {
  test(`${artifact.name} fixture validates and round-trips`, () => {
    const schema = readJson(artifact.schemaPath);
    const fixture = readJson(artifact.fixturePath);
    const validate = ajv.compile(schema);

    assert.equal(
      validate(fixture),
      true,
      ajv.errorsText(validate.errors, { separator: "\n" }),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(fixture)), fixture);
    assert.equal(schema.$schema, "http://json-schema.org/draft-07/schema#");
    assert.match(schema.$id, /^https:\/\/noui\.bot\/specs\/mcp-billing-v1\//);
  });
}

test("billing envelope rejects an incomplete metadata object", () => {
  const schema = readJson(artifacts[0].schemaPath);
  const fixture = readJson(artifacts[0].fixturePath);
  const validate = ajv.compile(schema);
  const invalid = clone(fixture);
  delete invalid.meta.cost_cents;

  assert.equal(validate(invalid), false);
  assert.ok(validate.errors.some((error) => error.keyword === "required"));
});

test("meter event requires a tool identifier and rejects unknown statuses", () => {
  const schema = readJson(artifacts[1].schemaPath);
  const fixture = readJson(artifacts[1].fixturePath);
  const validate = ajv.compile(schema);
  const missingTool = clone(fixture);
  delete missingTool.tool_name;

  assert.equal(validate(missingTool), false);

  const invalidStatus = clone(fixture);
  invalidStatus.status = "charged";
  assert.equal(validate(invalidStatus), false);
  assert.ok(validate.errors.some((error) => error.keyword === "enum"));
});

test("receipt rejects incomplete or unsupported receipt records", () => {
  const schema = readJson(artifacts[2].schemaPath);
  const fixture = readJson(artifacts[2].fixturePath);
  const validate = ajv.compile(schema);
  const missingSignature = clone(fixture);
  delete missingSignature.signature;

  assert.equal(validate(missingSignature), false);

  const invalidStatus = clone(fixture);
  invalidStatus.status = "insufficient_funds";
  assert.equal(validate(invalidStatus), false);
  assert.ok(validate.errors.some((error) => error.keyword === "enum"));
});

test("fictional receipt signature matches the real canonical field order", () => {
  const receipt = readJson(artifacts[2].fixturePath);
  const canonical = [
    receipt.receipt_id,
    receipt.tool_id,
    receipt.agent_id,
    receipt.provider_id,
    receipt.timestamp,
    receipt.cost_microcents.toString(),
    receipt.status,
  ].join("|");
  const signature = createHmac("sha256", fixtureSigningKey)
    .update(canonical)
    .digest("hex");

  assert.equal(signature, receipt.signature);
});

test("fixtures are sanitized and public receipts contain no raw payload", () => {
  for (const artifact of artifacts) {
    const fixtureText = fs.readFileSync(artifact.fixturePath, "utf8");
    assert.doesNotMatch(fixtureText, /(?:sk|pk|bz|whsec)_[A-Za-z0-9_-]+/);
    assert.doesNotMatch(fixtureText, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  }

  const receipt = readJson(artifacts[2].fixturePath);
  assert.equal(Object.hasOwn(receipt, "input"), false);
  assert.equal(Object.hasOwn(receipt, "output"), false);
});

test("schemas remain anchored to current route and signing source fields", () => {
  const proxySource = fs.readFileSync(
    path.join(root, "src", "app", "api", "bazaar", "proxy", "route.ts"),
    "utf8",
  );
  const meterSource = fs.readFileSync(
    path.join(root, "src", "app", "api", "v1", "bazaar", "meter", "route.ts"),
    "utf8",
  );
  const receiptRouteSource = fs.readFileSync(
    path.join(
      root,
      "src",
      "app",
      "api",
      "v1",
      "bazaar",
      "receipts",
      "[receiptId]",
      "route.ts",
    ),
    "utf8",
  );
  const signingSource = fs.readFileSync(
    path.join(root, "src", "lib", "receipts.ts"),
    "utf8",
  );
  const sdkSource = fs.readFileSync(
    path.join(root, "packages", "bazaar-sdk", "src", "index.ts"),
    "utf8",
  );

  for (const field of [
    "tool: tool.tool_name",
    "provider: provider.name",
    "cost_cents: actualCost",
    "latency_ms: latencyMs",
    "remaining_balance_cents:",
  ]) {
    assert.ok(proxySource.includes(field), `proxy source is missing ${field}`);
  }

  for (const field of [
    "body.tool_id",
    "body.tool_name",
    "body.agent_id",
    "body.status",
    "body.duration_ms",
    "body.input_tokens",
    "body.output_tokens",
    "body.metadata",
  ]) {
    assert.ok(meterSource.includes(field), `meter source is missing ${field}`);
  }

  for (const field of [
    "receipt_id: receipt.receipt_id",
    "tool_id: receipt.tool_id",
    "tool_name: receipt.tool_name",
    "agent_id: receipt.agent_id",
    "provider_id: receipt.provider_id",
    "timestamp: receipt.timestamp",
    "duration_ms: receipt.duration_ms",
    "cost_microcents: receipt.cost_microcents",
    "status: receipt.status",
    "signature: receipt.signature",
    "created_at: receipt.created_at",
  ]) {
    assert.ok(
      receiptRouteSource.includes(field),
      `receipt route source is missing ${field}`,
    );
  }

  assert.ok(
    signingSource.includes(
      "receipt_id|tool_id|agent_id|provider_id|timestamp|cost_microcents|status",
    ),
  );
  assert.ok(meterSource.includes("input_hash: inputTokens ? String(inputTokens)"));
  assert.ok(meterSource.includes("output_hash: outputTokens ? String(outputTokens)"));
  assert.equal(proxySource.includes("generateReceiptId"), false);
  assert.equal(proxySource.includes("signReceipt"), false);

  for (const field of [
    "tokens_used?: number",
    "success?: boolean",
    "consumer_id?: string",
  ]) {
    assert.ok(sdkSource.includes(field), `SDK source is missing ${field}`);
  }
});

test("prose spec links all machine-readable artifacts and records known deltas", () => {
  const spec = fs.readFileSync(
    path.join(root, "public", "specs", "mcp-billing-v1.md"),
    "utf8",
  );

  for (const relativePath of [
    "./mcp-billing-v1/billing-envelope.schema.json",
    "./mcp-billing-v1/meter-event.schema.json",
    "./mcp-billing-v1/receipt.schema.json",
    "./mcp-billing-v1/fixtures/billing-envelope.fixture.json",
    "./mcp-billing-v1/fixtures/meter-event.fixture.json",
    "./mcp-billing-v1/fixtures/receipt.fixture.json",
  ]) {
    assert.ok(spec.includes(relativePath), `spec is missing ${relativePath}`);
  }

  assert.ok(spec.includes("meta.tool_name"));
  assert.ok(spec.includes("tokens_used"));
  assert.ok(spec.includes("input_hash"));
  assert.ok(spec.includes("receipt persistence fails"));
  assert.ok(spec.includes("without generating a signed receipt"));
  assert.ok(spec.includes("price_cents × 100"));
  assert.ok(spec.includes("price_cents × 10,000"));
  assert.ok(spec.includes("does not prove a live deployment"));
});
