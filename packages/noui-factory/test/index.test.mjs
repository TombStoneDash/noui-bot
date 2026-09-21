import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory, generateManifest, validateConfig } from '../src/index.ts';

test('generateManifest: id is trimmed, lowercased, slugged, no edge dashes', () => {
  const m = generateManifest({ name: '  My Agent! v2 ' });
  assert.strictEqual(m.id, 'my-agent-v2');
  assert.strictEqual(m.name, '  My Agent! v2 ');
  assert.strictEqual(m.version, '0.1.0');
  assert.deepStrictEqual(m.tools, []);
});

test('generateManifest: collapses runs of punctuation into one dash', () => {
  assert.strictEqual(generateManifest({ name: 'a---b__c  d' }).id, 'a-b-c-d');
});

test('validateConfig: whitespace-only name is rejected', () => {
  const r = validateConfig({ name: '   ' });
  assert.strictEqual(r.valid, false);
  assert.deepStrictEqual(r.errors, ['Factory name is required']);
});

test('validateConfig: missing and non-string names are rejected', () => {
  assert.deepStrictEqual(validateConfig({}).errors, ['Factory name is required']);
  assert.deepStrictEqual(validateConfig({ name: 42 }).errors, ['Factory name is required']);
});

test('validateConfig: null tool entry reports an index error instead of throwing', () => {
  const r = validateConfig({ name: 'ok', tools: [null] });
  assert.strictEqual(r.valid, false);
  assert.deepStrictEqual(r.errors, ['Tool at index 0 must be an object']);
});

test('validateConfig: non-object tool entries are reported per index', () => {
  const r = validateConfig({ name: 'ok', tools: [{ name: 'a', description: 'd' }, 'str', 7] });
  assert.deepStrictEqual(r.errors, [
    'Tool at index 1 must be an object',
    'Tool at index 2 must be an object',
  ]);
});

test('validateConfig: non-array tools produces a single error and is not iterated', () => {
  const r = validateConfig({ name: 'ok', tools: 'nope' });
  assert.strictEqual(r.valid, false);
  assert.deepStrictEqual(r.errors, ['tools must be an array']);
});

test('validateConfig: keeps existing messages for well-shaped tools', () => {
  const r = validateConfig({ name: 'ok', tools: [{ name: '', description: '' }, { name: 'x' }] });
  assert.deepStrictEqual(r.errors, [
    'Tool name is required',
    'Tool unknown missing description',
    'Tool x missing description',
  ]);
});

test('validateConfig: fully valid config passes', () => {
  const r = validateConfig({
    name: 'Valid Agent',
    version: '1.2.3',
    tools: [{ name: 'search', description: 'Searches things' }],
  });
  assert.deepStrictEqual(r, { valid: true, errors: [] });
});

test('createFactory: defaults version to 0.1.0 and preserves explicit version', () => {
  assert.strictEqual(createFactory({ name: 'x' }).version, '0.1.0');
  assert.strictEqual(createFactory({ name: 'x', version: '2.0.0' }).version, '2.0.0');
});
