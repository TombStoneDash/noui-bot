import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv from "ajv";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specRoot = path.join(root, "public", "specs", "mcp-billing-v1");
const fixtureRoot = path.join(specRoot, "fixtures");
const fixtureSigningKey = "noui-spec-fixture-secret-v1";
const proxyRoutePath = path.join(
  root,
  "src",
  "app",
  "api",
  "bazaar",
  "proxy",
  "route.ts",
);
const receiptSignerPath = path.join(root, "src", "lib", "receipts.ts");

async function importProductionSignerWithFixtureKey() {
  const previousSigningSecret = process.env.RECEIPT_SIGNING_SECRET;
  process.env.RECEIPT_SIGNING_SECRET = fixtureSigningKey;

  try {
    const signerModule = await import(pathToFileURL(receiptSignerPath).href);
    return signerModule.signReceipt;
  } finally {
    if (previousSigningSecret === undefined) {
      delete process.env.RECEIPT_SIGNING_SECRET;
    } else {
      process.env.RECEIPT_SIGNING_SECRET = previousSigningSecret;
    }
  }
}

const signReceipt = await importProductionSignerWithFixtureKey();

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

function signingInput(receipt) {
  return {
    receipt_id: receipt.receipt_id,
    tool_id: receipt.tool_id,
    agent_id: receipt.agent_id,
    provider_id: receipt.provider_id,
    timestamp: receipt.timestamp,
    cost_microcents: receipt.cost_microcents,
    status: receipt.status,
  };
}

function propertyName(property) {
  if (
    property.name &&
    (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
  ) {
    return property.name.text;
  }

  return undefined;
}

function findSuccessfulProxyEnvelope(source) {
  const sourceFile = ts.createSourceFile(
    proxyRoutePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const candidates = [];

  function visit(node) {
    if (ts.isReturnStatement(node) && ts.isCallExpression(node.expression)) {
      const call = node.expression;
      const callee = call.expression;
      const payload = call.arguments[0];

      if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === "NextResponse" &&
        callee.name.text === "json" &&
        payload &&
        ts.isObjectLiteralExpression(payload)
      ) {
        const resultProperty = payload.properties.find(
          (property) => propertyName(property) === "result",
        );
        const metaProperty = payload.properties.find(
          (property) => propertyName(property) === "meta",
        );

        if (
          resultProperty &&
          metaProperty &&
          ts.isPropertyAssignment(metaProperty) &&
          ts.isObjectLiteralExpression(metaProperty.initializer)
        ) {
          candidates.push({
            sourceFile,
            meta: metaProperty.initializer,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  assert.equal(
    candidates.length,
    1,
    `expected one successful NextResponse.json({ result, meta }) return, found ${candidates.length}`,
  );
  return candidates[0];
}

function successfulProxyMetaKeys(source) {
  const { meta } = findSuccessfulProxyEnvelope(source);
  return meta.properties.map((property) => {
    const name = propertyName(property);
    assert.ok(name, "successful proxy meta contains an unsupported property");
    return name;
  });
}

function assertSuccessfulProxyEnvelopeMatchesSchema(source, schema) {
  const expected = [
    "tool",
    "provider",
    "cost_cents",
    "cost",
    "latency_ms",
    "remaining_balance_cents",
  ].sort();
  const sourceKeys = successfulProxyMetaKeys(source).sort();
  const requiredKeys = [...schema.properties.meta.required].sort();
  const schemaKeys = Object.keys(schema.properties.meta.properties).sort();

  assert.deepEqual(
    sourceKeys,
    expected,
    "successful proxy meta keys drifted from the NB-01 envelope",
  );
  assert.deepEqual(requiredKeys, expected);
  assert.deepEqual(schemaKeys, expected);
}

function mutateSuccessfulProxyMetaKey(source, currentName, replacementName) {
  const { sourceFile, meta } = findSuccessfulProxyEnvelope(source);
  const property = meta.properties.find(
    (candidate) => propertyName(candidate) === currentName,
  );
  assert.ok(property?.name, `successful proxy meta is missing ${currentName}`);

  return (
    source.slice(0, property.name.getStart(sourceFile)) +
    replacementName +
    source.slice(property.name.getEnd())
  );
}

async function signWithIsolatedSignerSource(source, receipt) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "noui-receipt-mutation-"),
  );
  const temporarySigner = path.join(temporaryRoot, "receipts.mutation.ts");
  const previousSigningSecret = process.env.RECEIPT_SIGNING_SECRET;

  try {
    fs.writeFileSync(temporarySigner, source, "utf8");
    process.env.RECEIPT_SIGNING_SECRET = fixtureSigningKey;
    const signerModule = await import(pathToFileURL(temporarySigner).href);
    return signerModule.signReceipt(signingInput(receipt));
  } finally {
    if (previousSigningSecret === undefined) {
      delete process.env.RECEIPT_SIGNING_SECRET;
    } else {
      process.env.RECEIPT_SIGNING_SECRET = previousSigningSecret;
    }
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
  strictRequired: false,
  $data: false,
});
ajv.addFormat("date-time", {
  type: "string",
  validate(value) {
    return (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
      !Number.isNaN(Date.parse(value))
    );
  },
});

function compileSchema(schema) {
  const schemaWithoutIdentifier = clone(schema);
  delete schemaWithoutIdentifier.$id;
  return ajv.compile(schemaWithoutIdentifier);
}

for (const artifact of artifacts) {
  test(`${artifact.name} fixture validates and round-trips`, () => {
    const schema = readJson(artifact.schemaPath);
    const fixture = readJson(artifact.fixturePath);
    const validate = compileSchema(schema);

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
  const validate = compileSchema(schema);
  const invalid = clone(fixture);
  delete invalid.meta.cost_cents;

  assert.equal(validate(invalid), false);
  assert.ok(validate.errors.some((error) => error.keyword === "required"));
});

test("meter event requires a tool identifier and rejects unknown statuses", () => {
  const schema = readJson(artifacts[1].schemaPath);
  const fixture = readJson(artifacts[1].fixturePath);
  const validate = compileSchema(schema);
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
  const validate = compileSchema(schema);
  const missingSignature = clone(fixture);
  delete missingSignature.signature;

  assert.equal(validate(missingSignature), false);

  const invalidStatus = clone(fixture);
  invalidStatus.status = "insufficient_funds";
  assert.equal(validate(invalidStatus), false);
  assert.ok(validate.errors.some((error) => error.keyword === "enum"));
});

test("fictional receipt signature is generated by production signReceipt", () => {
  const receipt = readJson(artifacts[2].fixturePath);
  const signature = signReceipt(signingInput(receipt));

  assert.equal(signature, receipt.signature);

  const tampered = clone(receipt);
  tampered.cost_microcents += 1;
  assert.notEqual(signReceipt(signingInput(tampered)), receipt.signature);
});

test("canonical-order mutation changes the production signer result", async () => {
  const receipt = readJson(artifacts[2].fixturePath);
  const signingSource = fs.readFileSync(receiptSignerPath, "utf8");
  const canonicalOrder =
    "    params.cost_microcents.toString(),\n    params.status,";
  const swappedOrder =
    "    params.status,\n    params.cost_microcents.toString(),";

  assert.equal(
    signingSource.split(canonicalOrder).length - 1,
    1,
    "production signer canonical pair must occur exactly once",
  );
  const mutatedSource = signingSource.replace(canonicalOrder, swappedOrder);
  const mutatedSignature = await signWithIsolatedSignerSource(
    mutatedSource,
    receipt,
  );

  assert.notEqual(mutatedSignature, receipt.signature);
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

test("billing schema matches the successful proxy response AST", () => {
  const proxySource = fs.readFileSync(proxyRoutePath, "utf8");
  const billingSchema = readJson(artifacts[0].schemaPath);

  assertSuccessfulProxyEnvelopeMatchesSchema(proxySource, billingSchema);
});

test("successful proxy meta.tool_name mutation is rejected", () => {
  const proxySource = fs.readFileSync(proxyRoutePath, "utf8");
  const billingSchema = readJson(artifacts[0].schemaPath);
  const mutatedSource = mutateSuccessfulProxyMetaKey(
    proxySource,
    "tool",
    "tool_name",
  );

  assert.match(mutatedSource, /message: errorMessage,\s+tool: tool\.tool_name,/);
  assert.throws(
    () => assertSuccessfulProxyEnvelopeMatchesSchema(mutatedSource, billingSchema),
    /successful proxy meta keys drifted/,
  );
});

test("remaining schema and mismatch anchors track current sources", () => {
  const proxySource = fs.readFileSync(proxyRoutePath, "utf8");
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
  const sdkSource = fs.readFileSync(
    path.join(root, "packages", "bazaar-sdk", "src", "index.ts"),
    "utf8",
  );

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

  assert.ok(meterSource.includes("input_hash: inputTokens ? String(inputTokens)"));
  assert.ok(meterSource.includes("output_hash: outputTokens ? String(outputTokens)"));
  assert.equal(proxySource.includes("generateReceiptId"), false);
  assert.equal(proxySource.includes("signReceipt"), false);

  for (const field of [
    "tokens_used?: number",
    "success?: boolean",
    "consumer_id?: string",
    "tool_name: string",
    "invocation_id?: string",
    "Promise<{ recorded: boolean; invocation_id: string }>",
  ]) {
    assert.ok(sdkSource.includes(field), `SDK source is missing ${field}`);
  }

  assert.ok(proxySource.includes("cost: actualCost === 0"));
  assert.equal(
    successfulProxyMetaKeys(proxySource).includes("invocation_id"),
    false,
  );
  assert.ok(meterSource.includes("metered: true"));
  assert.equal(meterSource.includes("recorded: true"), false);
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
    "./mcp-billing-v1/LICENSE",
  ]) {
    assert.ok(spec.includes(relativePath), `spec is missing ${relativePath}`);
  }

  assert.ok(spec.includes("meta.tool_name"));
  assert.ok(spec.includes("omits `meta.cost`"));
  assert.ok(spec.includes("SDK-only optional `meta.invocation_id`"));
  assert.ok(spec.includes("tokens_used"));
  assert.ok(spec.includes("`{ recorded, invocation_id }`"));
  assert.ok(spec.includes("`{ metered, tool_id, agent_id, cost_microcents"));
  assert.ok(spec.includes("input_hash"));
  assert.ok(spec.includes("receipt persistence fails"));
  assert.ok(spec.includes("without generating a signed receipt"));
  assert.ok(spec.includes("price_cents × 100"));
  assert.ok(spec.includes("price_cents × 10,000"));
  assert.ok(spec.includes("does not prove live deployment"));
  assert.match(
    spec,
    /does not\s+prove every metered call receives a receipt/,
  );
  assert.match(spec, /candidate\s+implementation/i);
  assert.equal(
    spec.includes("is the reference implementation of this spec"),
    false,
  );

  const license = fs.readFileSync(path.join(specRoot, "LICENSE"), "utf8");
  assert.ok(license.includes("MIT License"));
  assert.ok(license.includes("Copyright (c) 2026 TombStone Dash LLC"));
  assert.ok(license.includes("applies only to the MCP Billing Spec v1"));
});
