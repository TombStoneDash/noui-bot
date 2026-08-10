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
const meterValidatorPath = path.join(root, "src", "lib", "meter-event.ts");
const meterRoutePath = path.join(
  root,
  "src",
  "app",
  "api",
  "v1",
  "bazaar",
  "meter",
  "route.ts",
);
const publicReceiptRoutePath = path.join(
  root,
  "src",
  "app",
  "api",
  "v1",
  "bazaar",
  "receipts",
  "[receiptId]",
  "route.ts",
);
const sdkSourcePath = path.join(
  root,
  "packages",
  "bazaar-sdk",
  "src",
  "index.ts",
);

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
const { validateMeterEventRequest } = await import(
  pathToFileURL(meterValidatorPath).href
);

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

function parseTypeScript(sourcePath, source) {
  return ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function normalizeTypeScriptText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function findNamedInterface(sourcePath, source, interfaceName) {
  const sourceFile = parseTypeScript(sourcePath, source);
  const matches = sourceFile.statements.filter(
    (statement) =>
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === interfaceName,
  );

  assert.equal(
    matches.length,
    1,
    `expected one ${interfaceName} interface, found ${matches.length}`,
  );
  return { sourceFile, declaration: matches[0] };
}

function findInterfaceProperty(declaration, memberName) {
  const matches = declaration.members.filter(
    (member) => propertyName(member) === memberName,
  );
  assert.equal(
    matches.length,
    1,
    `expected one ${declaration.name.text}.${memberName} property, found ${matches.length}`,
  );
  assert.ok(
    ts.isPropertySignature(matches[0]),
    `${declaration.name.text}.${memberName} must be a property signature`,
  );
  return matches[0];
}

function propertySignatureShape(property, sourceFile) {
  const name = propertyName(property);
  assert.ok(name, "interface contains an unsupported member name");
  assert.ok(
    ts.isPropertySignature(property),
    `${name} must be a property signature`,
  );
  assert.ok(property.type, `${name} must declare a type`);
  return {
    name,
    optional: Boolean(property.questionToken),
    type: normalizeTypeScriptText(property.type.getText(sourceFile)),
  };
}

function sortedMemberShapes(members, sourceFile) {
  return members
    .map((member) => propertySignatureShape(member, sourceFile))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function expectedMemberShapes(entries) {
  return entries
    .map(([name, type, optional = false]) => ({ name, type, optional }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function findNamedClass(sourceFile, className) {
  const matches = sourceFile.statements.filter(
    (statement) =>
      ts.isClassDeclaration(statement) && statement.name?.text === className,
  );
  assert.equal(
    matches.length,
    1,
    `expected one ${className} class, found ${matches.length}`,
  );
  return matches[0];
}

function assertSdkContracts(sourcePath, source) {
  const {
    sourceFile: proxySourceFile,
    declaration: proxyResult,
  } = findNamedInterface(sourcePath, source, "ProxyResult");
  const resultProperty = findInterfaceProperty(proxyResult, "result");
  const metaProperty = findInterfaceProperty(proxyResult, "meta");

  assert.deepEqual(
    proxyResult.members.map((member) => propertyName(member)),
    ["result", "meta"],
    "ProxyResult top-level fields drifted",
  );
  assert.equal(
    normalizeTypeScriptText(resultProperty.type.getText(proxySourceFile)),
    "unknown",
    "ProxyResult.result type drifted",
  );
  assert.ok(
    metaProperty.type && ts.isTypeLiteralNode(metaProperty.type),
    "ProxyResult.meta must be an inline type literal",
  );
  assert.deepEqual(
    sortedMemberShapes(metaProperty.type.members, proxySourceFile),
    expectedMemberShapes([
      ["cost_cents", "number"],
      ["latency_ms", "number"],
      ["provider", "string"],
      ["remaining_balance_cents", "number"],
      ["tool_name", "string"],
      ["invocation_id", "string", true],
    ]),
    "ProxyResult.meta shape drifted",
  );

  const {
    sourceFile: meterPayloadSourceFile,
    declaration: meterPayload,
  } = findNamedInterface(sourcePath, source, "MeterPayload");
  assert.deepEqual(
    sortedMemberShapes(meterPayload.members, meterPayloadSourceFile),
    expectedMemberShapes([
      ["tool_name", "string"],
      ["duration_ms", "number", true],
      ["tokens_used", "number", true],
      ["success", "boolean", true],
      ["consumer_id", "string", true],
      ["metadata", "Record<string, unknown>", true],
    ]),
    "MeterPayload shape drifted",
  );

  const sdkSourceFile = parseTypeScript(sourcePath, source);
  const meterApi = findNamedClass(sdkSourceFile, "MeterAPI");
  const recordMethods = meterApi.members.filter(
    (member) =>
      ts.isMethodDeclaration(member) && propertyName(member) === "record",
  );
  assert.equal(
    recordMethods.length,
    1,
    `expected one MeterAPI.record method, found ${recordMethods.length}`,
  );

  const recordMethod = recordMethods[0];
  assert.equal(recordMethod.parameters.length, 1);
  const payloadParameter = recordMethod.parameters[0];
  assert.ok(
    ts.isIdentifier(payloadParameter.name) &&
      payloadParameter.name.text === "payload",
    "MeterAPI.record parameter must be named payload",
  );
  assert.equal(
    normalizeTypeScriptText(payloadParameter.type?.getText(sdkSourceFile) || ""),
    "MeterPayload",
    "MeterAPI.record payload type drifted",
  );
  assert.equal(
    normalizeTypeScriptText(recordMethod.type?.getText(sdkSourceFile) || ""),
    "Promise<{ recorded: boolean; invocation_id: string }>",
    "MeterAPI.record return type drifted",
  );
  assert.ok(recordMethod.body, "MeterAPI.record must have a body");
  const returnStatements = recordMethod.body.statements.filter(
    ts.isReturnStatement,
  );
  assert.equal(
    returnStatements.length,
    1,
    `expected one MeterAPI.record return, found ${returnStatements.length}`,
  );
  assert.equal(
    normalizeTypeScriptText(
      returnStatements[0].expression?.getText(sdkSourceFile) || "",
    ),
    'this.client.request("POST", "/api/v1/bazaar/meter", payload)',
    "MeterAPI.record request binding drifted",
  );
}

function mutateSdkProxyMetaProperty(
  sourcePath,
  source,
  currentName,
  replacementName,
) {
  const { sourceFile, declaration } = findNamedInterface(
    sourcePath,
    source,
    "ProxyResult",
  );
  const metaProperty = findInterfaceProperty(declaration, "meta");
  assert.ok(
    metaProperty.type && ts.isTypeLiteralNode(metaProperty.type),
    "ProxyResult.meta must be an inline type literal",
  );
  const matches = metaProperty.type.members.filter(
    (member) => propertyName(member) === currentName,
  );
  assert.equal(
    matches.length,
    1,
    `expected one ProxyResult.meta.${currentName} property`,
  );
  assert.ok(matches[0].name);

  return (
    source.slice(0, matches[0].name.getStart(sourceFile)) +
    replacementName +
    source.slice(matches[0].name.getEnd())
  );
}

function findSuccessfulProxyEnvelope(source) {
  const sourceFile = parseTypeScript(proxyRoutePath, source);
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

function findNamedFunction(sourcePath, source, functionName) {
  const sourceFile = parseTypeScript(sourcePath, source);
  const matches = sourceFile.statements.filter(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === functionName,
  );
  assert.equal(
    matches.length,
    1,
    `expected one ${functionName} function, found ${matches.length}`,
  );
  assert.ok(matches[0].body, `${functionName} must have a body`);
  return { sourceFile, declaration: matches[0] };
}

function findVariableDeclaration(functionDeclaration, variableName) {
  const matches = [];

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName
    ) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(functionDeclaration.body);
  assert.equal(
    matches.length,
    1,
    `expected one ${variableName} declaration, found ${matches.length}`,
  );
  assert.ok(matches[0].initializer, `${variableName} must have an initializer`);
  return matches[0];
}

function assertMeterRouteRequestContract(sourcePath, source) {
  const { sourceFile, declaration } = findNamedFunction(
    sourcePath,
    source,
    "POST",
  );
  const expectedInitializers = new Map([
    ["toolId", "body.tool_id"],
    ["toolName", "body.tool_name"],
    ["agentId", "body.agent_id || owner.id"],
    ["status", 'body.status || "success"'],
    ["durationMs", "body.duration_ms ?? 0"],
    ["inputTokens", "body.input_tokens ?? 0"],
    ["outputTokens", "body.output_tokens ?? 0"],
    ["metadata", "body.metadata ?? {}"],
  ]);

  for (const [variableName, expectedInitializer] of expectedInitializers) {
    const variable = findVariableDeclaration(declaration, variableName);
    assert.equal(
      normalizeTypeScriptText(variable.initializer.getText(sourceFile)),
      expectedInitializer,
      `meter ${variableName} initializer drifted`,
    );
    assert.ok(
      variable.parent.flags & ts.NodeFlags.Const,
      `meter ${variableName} must remain const`,
    );
  }

  const requestValidation = [];
  function visit(node) {
    if (
      ts.isIfStatement(node) &&
      normalizeTypeScriptText(node.expression.getText(sourceFile)) ===
        "!validateMeterEventRequest(body)"
    ) {
      requestValidation.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(declaration.body);
  assert.equal(
    requestValidation.length,
    1,
    `expected one runtime meter-event validation, found ${requestValidation.length}`,
  );

  const getSupabaseCall = source.indexOf("const sb = getSupabase();");
  assert.notEqual(getSupabaseCall, -1, "meter route must initialize Supabase");
  assert.ok(
    requestValidation[0].getStart(sourceFile) < getSupabaseCall,
    "meter request validation must happen before persistence begins",
  );

  let consumerAgentMappings = 0;
  let namedAgentMappings = 0;
  function countAgentMappings(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.initializer) &&
      node.initializer.text === "agentId"
    ) {
      if (propertyName(node) === "consumer_id") {
        consumerAgentMappings += 1;
      }
      if (propertyName(node) === "agent_id") {
        namedAgentMappings += 1;
      }
    }
    ts.forEachChild(node, countAgentMappings);
  }
  countAgentMappings(declaration.body);
  assert.equal(
    consumerAgentMappings,
    1,
    "meter usage consumer_id must be sourced from agentId exactly once",
  );
  assert.equal(
    namedAgentMappings,
    3,
    "meter signer, receipt, and response agent_id must use agentId",
  );
}

function mutateMeterRouteToIgnoreAgentId(sourcePath, source) {
  const { sourceFile, declaration } = findNamedFunction(
    sourcePath,
    source,
    "POST",
  );
  const agentId = findVariableDeclaration(declaration, "agentId");
  const statement = agentId.parent.parent;
  assert.ok(
    ts.isVariableStatement(statement),
    "agentId must be declared in a variable statement",
  );

  return (
    source.slice(0, statement.getStart(sourceFile)) +
    "void body.agent_id;\n  const agentId = owner.id;" +
    source.slice(statement.getEnd())
  );
}

function findNextResponsePayload(sourcePath, source, predicate, description) {
  const sourceFile = parseTypeScript(sourcePath, source);
  const matches = [];

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression;
      const payload = node.arguments[0];
      if (
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === "NextResponse" &&
        callee.name.text === "json" &&
        payload &&
        ts.isObjectLiteralExpression(payload) &&
        predicate(payload)
      ) {
        matches.push(payload);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  assert.equal(
    matches.length,
    1,
    `expected one ${description}, found ${matches.length}`,
  );
  return { sourceFile, payload: matches[0] };
}

function findObjectProperty(objectLiteral, memberName, description) {
  const matches = objectLiteral.properties.filter(
    (property) => propertyName(property) === memberName,
  );
  assert.equal(
    matches.length,
    1,
    `expected one ${description}.${memberName} property, found ${matches.length}`,
  );
  return matches[0];
}

function objectLiteralKeys(objectLiteral) {
  return objectLiteral.properties.map((property) => {
    const name = propertyName(property);
    assert.ok(name, "object contains an unsupported property name");
    return name;
  });
}

function assertMeterResponseContract(sourcePath, source) {
  const { payload } = findNextResponsePayload(
    sourcePath,
    source,
    (candidate) =>
      candidate.properties.some(
        (property) => propertyName(property) === "metered",
      ),
    "meter success response",
  );
  assert.deepEqual(
    objectLiteralKeys(payload),
    [
      "metered",
      "tool_id",
      "agent_id",
      "cost_microcents",
      "cost_cents",
      "status",
      "timestamp",
      "receipt",
    ],
    "meter response fields drifted",
  );

  const receiptProperty = findObjectProperty(
    payload,
    "receipt",
    "meter response",
  );
  assert.ok(
    ts.isPropertyAssignment(receiptProperty) &&
      ts.isObjectLiteralExpression(receiptProperty.initializer),
    "meter response receipt must be an object literal",
  );
  assert.deepEqual(
    objectLiteralKeys(receiptProperty.initializer),
    ["receipt_id", "signature", "verify_url"],
    "meter response receipt fields drifted",
  );
}

function findPublicReceiptObject(sourcePath, source) {
  const { sourceFile, payload } = findNextResponsePayload(
    sourcePath,
    source,
    (candidate) =>
      candidate.properties.some(
        (property) => propertyName(property) === "receipt",
      ) &&
      candidate.properties.some(
        (property) => propertyName(property) === "verification",
      ),
    "public receipt verification response",
  );
  const receiptProperty = findObjectProperty(
    payload,
    "receipt",
    "public verification response",
  );
  assert.ok(
    ts.isPropertyAssignment(receiptProperty) &&
      ts.isObjectLiteralExpression(receiptProperty.initializer),
    "public receipt must be an object literal",
  );
  return { sourceFile, receipt: receiptProperty.initializer };
}

function assertPublicReceiptContract(sourcePath, source, schema) {
  const { sourceFile, receipt } = findPublicReceiptObject(sourcePath, source);
  const expectedFields = [
    "receipt_id",
    "tool_id",
    "tool_name",
    "agent_id",
    "provider_id",
    "timestamp",
    "duration_ms",
    "cost_microcents",
    "status",
    "signature",
    "created_at",
  ];
  assert.deepEqual(
    objectLiteralKeys(receipt),
    expectedFields,
    "public receipt fields drifted",
  );
  assert.deepEqual(
    [...schema.required].sort(),
    [...expectedFields].sort(),
    "public receipt required schema fields drifted",
  );
  assert.deepEqual(
    Object.keys(schema.properties).sort(),
    [...expectedFields].sort(),
    "public receipt schema properties drifted",
  );
  assert.equal(schema.additionalProperties, false);

  for (const field of expectedFields) {
    const property = findObjectProperty(receipt, field, "public receipt");
    assert.ok(
      ts.isPropertyAssignment(property),
      `public receipt ${field} must be a property assignment`,
    );
    assert.equal(
      normalizeTypeScriptText(property.initializer.getText(sourceFile)),
      `receipt.${field}`,
      `public receipt ${field} mapping drifted`,
    );
  }
}

function mutatePublicReceiptField(
  sourcePath,
  source,
  currentName,
  replacementName,
) {
  const { sourceFile, receipt } = findPublicReceiptObject(sourcePath, source);
  const property = findObjectProperty(receipt, currentName, "public receipt");
  assert.ok(property.name);
  return (
    source.slice(0, property.name.getStart(sourceFile)) +
    replacementName +
    source.slice(property.name.getEnd())
  );
}

function assertMeterReceiptHashMappings(sourcePath, source) {
  const sourceFile = parseTypeScript(sourcePath, source);
  const candidates = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "insert" &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const keys = objectLiteralKeys(node.arguments[0]);
      if (
        keys.includes("receipt_id") &&
        keys.includes("input_hash") &&
        keys.includes("output_hash")
      ) {
        candidates.push(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  assert.equal(
    candidates.length,
    1,
    `expected one receipt insert object, found ${candidates.length}`,
  );
  const expected = new Map([
    ["input_hash", "inputTokens ? String(inputTokens) : null"],
    ["output_hash", "outputTokens ? String(outputTokens) : null"],
  ]);
  for (const [field, initializer] of expected) {
    const property = findObjectProperty(
      candidates[0],
      field,
      "receipt insert",
    );
    assert.ok(ts.isPropertyAssignment(property));
    assert.equal(
      normalizeTypeScriptText(property.initializer.getText(sourceFile)),
      initializer,
      `receipt insert ${field} mapping drifted`,
    );
  }
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

test("meter event runtime validation rejects requests outside the published schema", () => {
  const schema = readJson(artifacts[1].schemaPath);
  const fixture = readJson(artifacts[1].fixturePath);
  const validate = compileSchema(schema);
  const invalidRequests = [
    [
      "missing tool identifier",
      (value) => {
        delete value.tool_name;
        return value;
      },
    ],
    ["invalid status enum", (value) => ({ ...value, status: "charged" })],
    ["negative duration", (value) => ({ ...value, duration_ms: -1 })],
    ["negative input token count", (value) => ({ ...value, input_tokens: -1 })],
    ["negative output token count", (value) => ({ ...value, output_tokens: -1 })],
    ["invalid metadata", (value) => ({ ...value, metadata: [] })],
  ];

  assert.equal(validateMeterEventRequest(fixture), true);
  for (const [description, mutate] of invalidRequests) {
    const invalid = mutate(clone(fixture));
    assert.equal(validate(invalid), false, `${description} must fail the schema`);
    assert.equal(
      validateMeterEventRequest(invalid),
      false,
      `${description} must fail runtime validation`,
    );
  }
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

test("meter, receipt, and SDK contracts track exact named source shapes", () => {
  const proxySource = fs.readFileSync(proxyRoutePath, "utf8");
  const meterSource = fs.readFileSync(meterRoutePath, "utf8");
  const receiptRouteSource = fs.readFileSync(
    publicReceiptRoutePath,
    "utf8",
  );
  const sdkSource = fs.readFileSync(sdkSourcePath, "utf8");
  const receiptSchema = readJson(artifacts[2].schemaPath);

  assertMeterRouteRequestContract(meterRoutePath, meterSource);
  assertMeterResponseContract(meterRoutePath, meterSource);
  assertMeterReceiptHashMappings(meterRoutePath, meterSource);
  assertPublicReceiptContract(
    publicReceiptRoutePath,
    receiptRouteSource,
    receiptSchema,
  );
  assertSdkContracts(sdkSourcePath, sdkSource);

  assert.equal(proxySource.includes("generateReceiptId"), false);
  assert.equal(proxySource.includes("signReceipt"), false);
  assert.equal(successfulProxyMetaKeys(proxySource).includes("cost"), true);
  assert.equal(
    successfulProxyMetaKeys(proxySource).includes("invocation_id"),
    false,
  );
});

test("SDK ProxyResult.meta.tool_name mutation is rejected", () => {
  const sdkSource = fs.readFileSync(sdkSourcePath, "utf8");
  const mutatedSource = mutateSdkProxyMetaProperty(
    sdkSourcePath,
    sdkSource,
    "tool_name",
    "tool",
  );

  assert.match(mutatedSource, /export interface Tool \{[\s\S]*tool_name: string;/);
  assert.throws(
    () => assertSdkContracts(sdkSourcePath, mutatedSource),
    /ProxyResult\.meta shape drifted/,
  );
});

test("meter route ignoring a supplied agent_id is rejected", () => {
  const meterSource = fs.readFileSync(meterRoutePath, "utf8");
  const mutatedSource = mutateMeterRouteToIgnoreAgentId(
    meterRoutePath,
    meterSource,
  );

  assert.ok(mutatedSource.includes("void body.agent_id"));
  assert.throws(
    () => assertMeterRouteRequestContract(meterRoutePath, mutatedSource),
    /meter agentId initializer drifted/,
  );
});

test("public receipt field mutation is rejected", () => {
  const receiptRouteSource = fs.readFileSync(
    publicReceiptRoutePath,
    "utf8",
  );
  const receiptSchema = readJson(artifacts[2].schemaPath);
  const mutatedSource = mutatePublicReceiptField(
    publicReceiptRoutePath,
    receiptRouteSource,
    "tool_name",
    "tool_label",
  );

  assert.throws(
    () =>
      assertPublicReceiptContract(
        publicReceiptRoutePath,
        mutatedSource,
        receiptSchema,
      ),
    /public receipt fields drifted/,
  );
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
  const expectedLicensedPaths = [
    "../mcp-billing-v1.md",
    "./billing-envelope.schema.json",
    "./meter-event.schema.json",
    "./receipt.schema.json",
    "./fixtures/billing-envelope.fixture.json",
    "./fixtures/meter-event.fixture.json",
    "./fixtures/receipt.fixture.json",
  ];
  const declaredLicensedPaths = license
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));

  assert.ok(license.includes("MIT License"));
  assert.ok(license.includes("Copyright (c) 2026 TombStone Dash LLC"));
  assert.deepEqual(
    declaredLicensedPaths,
    expectedLicensedPaths,
    "MIT scope paths drifted",
  );
  for (const relativePath of declaredLicensedPaths) {
    assert.equal(
      fs.existsSync(path.resolve(specRoot, relativePath)),
      true,
      `MIT-scoped artifact is missing ${relativePath}`,
    );
  }
  assert.equal(
    path.resolve(specRoot, declaredLicensedPaths[0]),
    path.join(root, "public", "specs", "mcp-billing-v1.md"),
    "MIT scope must explicitly cover the parent-directory prose",
  );
});
