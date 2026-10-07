import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

process.env.RECEIPT_SIGNING_SECRET = 'noui-spec-fixture-secret-v1';
const { signReceipt, verifyReceipt } = await import('../src/lib/receipts.ts');
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const root = '../public/specs/mcp-billing-v1';
const spec = await read(`${root}.md`);
const artifacts = await Promise.all(['billing-envelope', 'meter-event', 'receipt'].map(async (name) => ({
  name,
  schema: JSON.parse(await read(`${root}/${name}.schema.json`)),
  fixture: JSON.parse(await read(`${root}/fixtures/${name}.fixture.json`)),
})));
const [envelope, meter, receipt] = artifacts.map(({ fixture }) => fixture);
const signedFields = ['receipt_id', 'tool_id', 'agent_id', 'provider_id', 'timestamp', 'cost_microcents', 'status'];

// Targeted checks for this profile, not a general JSON Schema validator.
for (const { name, schema, fixture } of artifacts) {
  test(`${name}: published example and fixture agree and round-trip`, () => {
    assert.deepEqual(JSON.parse(JSON.stringify(fixture)), fixture);
    const examples = [...spec.matchAll(/```json\n([\s\S]*?)```/g)].map((match) => JSON.parse(match[1]));
    assert.ok(examples.some((example) => JSON.stringify(example) === JSON.stringify(fixture)));
    assert.equal(schema.$id, `https://noui.bot/specs/mcp-billing-v1/${name}.schema.json`);
    for (const field of schema.required ?? []) assert.ok(Object.hasOwn(fixture, field), field);
    for (const field of Object.keys(fixture)) assert.ok(Object.hasOwn(schema.properties, field), field);
  });
}

test('billing envelope retains the current proxy field names and dollar display', () => {
  const metaSchema = artifacts[0].schema.properties.meta;
  assert.deepEqual(Object.keys(envelope.meta).sort(), [...metaSchema.required].sort());
  assert.equal(envelope.meta.cost, `$${(envelope.meta.cost_cents / 100).toFixed(4)}`);
  assert.equal(receipt.cost_microcents, envelope.meta.cost_cents * 10_000);
  assert.equal(receipt.cost_microcents / 1_000_000, 0.01);
  assert.equal(envelope.meta.tool, meter.tool_name);
  assert.equal(receipt.tool_name, meter.tool_name);
  assert.equal(receipt.agent_id, meter.agent_id);
});

test('meter profile supports either identifier and documents the status enum', () => {
  const schema = artifacts[1].schema;
  assert.deepEqual(schema.anyOf, [{ required: ['tool_id'] }, { required: ['tool_name'] }]);
  assert.deepEqual(schema.properties.status.enum, ['success', 'error', 'timeout', 'rate_limited']);
  assert.ok(schema.properties.status.enum.includes(meter.status));
  assert.equal(schema.properties.status.default, 'success');
  assert.match(spec, /not runtime schema validation/);
});

test('receipt schema describes the legacy object; signature agrees with independent HMAC and real signer', () => {
  const schema = artifacts[2].schema;
  assert.deepEqual(Object.keys(receipt).sort(), [...schema.required].sort());
  assert.match(receipt.receipt_id, new RegExp(schema.properties.receipt_id.pattern));
  assert.match(receipt.signature, new RegExp(schema.properties.signature.pattern));
  assert.ok(Number.isSafeInteger(receipt.cost_microcents));
  assert.ok(receipt.cost_microcents >= 0);
  const canonical = signedFields.map((field) => receipt[field]).join('|');
  assert.equal(receipt.signature, createHmac('sha256', 'noui-spec-fixture-secret-v1').update(canonical).digest('hex'));
  assert.equal(signReceipt(receipt), receipt.signature);
  assert.equal(verifyReceipt(receipt), true);
  const documentedOrder = spec.match(/canonical = ([a-z_]+(?: \| [a-z_]+)+)/);
  assert.ok(documentedOrder);
  assert.deepEqual(documentedOrder[1].split(' | '), signedFields);
});

for (const field of signedFields) {
  test(`receipt rejects tampered signed field ${field}`, () => {
    const value = field === 'cost_microcents' ? receipt[field] + 1 : `${receipt[field]}-changed`;
    assert.equal(verifyReceipt({ ...receipt, [field]: value }), false);
  });
}

test('unsigned metadata does not change the signature', () => {
  assert.equal(signReceipt({ ...receipt, duration_ms: 999, tool_name: 'other', created_at: 'other' }), receipt.signature);
});

test('every published dollar example uses the post-14 multiplier', () => {
  const examples = [...spec.matchAll(/\$([\d.]+) per call = ([\d,]+) microcents/g)];
  assert.equal(examples.length, 3);
  for (const [, dollars, microcents] of examples) {
    assert.equal(Number(microcents.replaceAll(',', '')), Number(dollars) * 1_000_000);
  }
  assert.match(spec, /cost_microcents = cost_cents \* 10_000/);
  assert.match(spec, /dollars = cost_microcents \/ 1_000_000/);
  assert.doesNotMatch(spec, /known unit mismatch|1` cent → `100`/);
});

test('verification instructions preserve JSON submission and signature scope', () => {
  assert.match(spec, /POST \/api\/v1\/verify/);
  assert.match(spec, /GET \/api\/v1\/verify\?receipt_id=\.\.\.` returns HTTP 405/);
  assert.match(spec, /not public-key verification/);
  assert.match(spec, /not\nauthenticated by this signature/);
});
