import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const source = readFileSync('packages/bazaar-sdk/src/index.ts', 'utf8');
const changelog = readFileSync('packages/bazaar-sdk/CHANGELOG.md', 'utf8');
const packageJson = JSON.parse(readFileSync('packages/bazaar-sdk/package.json', 'utf8'));

function interfaceBlock(name) {
  const start = source.indexOf(`export interface ${name} {`);
  assert.notEqual(start, -1, `${name} interface exists`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  assert.fail(`${name} interface closes`);
}

test('proxy result and metering types match the wire shapes', () => {
  const proxy = interfaceBlock('ProxyResult');
  const meta = proxy.slice(proxy.indexOf('meta:'));
  assert.match(meta, /\btool:/);
  assert.match(meta, /\bremaining_balance_cents:/);
  assert.doesNotMatch(meta, /\binvocation_id\b|\btool_name:/);

  const meter = interfaceBlock('MeterPayload');
  assert.match(meter, /\binput_tokens\?/);
  assert.match(meter, /\boutput_tokens\?/);
  assert.match(meter, /\bstatus\?/);
  assert.doesNotMatch(meter, /\btokens_used\b|\bsuccess\?/);
});

test('receipt APIs use the public wire endpoints', () => {
  assert.match(source, /class ReceiptsAPI\s*\{/);
  assert.match(source, /\/api\/v1\/bazaar\/receipts\//);
  assert.match(source, /\/api\/v1\/verify/);
  assert.match(source, /public receipts: ReceiptsAPI/);
});

test('changelog records the 0.1.3 release and 0.1.2 version bump', () => {
  assert.match(changelog, /## \[0\.1\.3\]/);
  assert.match(changelog, /## \[0\.1\.2\]/);
  assert.match(changelog, /After review and merge to main/);
});

test('package version changes without changing dev dependencies', () => {
  assert.equal(packageJson.version, '0.1.3');
  assert.deepEqual(packageJson.devDependencies, {
    tsup: '^8.0.0',
    typescript: '^5.4.0',
    '@types/node': '^22.0.0',
  });
});

test('SDK TypeScript typechecks', () => {
  const result = spawnSync('node_modules/.bin/tsc', ['--noEmit', '-p', 'packages/bazaar-sdk/tsconfig.json'], {
    encoding: 'utf8',
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
