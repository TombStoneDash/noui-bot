import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/publish-packages.yml', 'utf8');
const factoryPackage = JSON.parse(
  readFileSync('packages/noui-factory/package.json', 'utf8'),
);

function workflowStep(name) {
  const marker = `      - name: ${name}`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);

  const nextStep = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, nextStep === -1 ? undefined : nextStep);
}

test('factory publish guard queries the package declared by its manifest', () => {
  const step = workflowStep('Publish noui-factory (if version changed)');
  const queries = [...step.matchAll(/npm view ([^\s]+) version/g)];

  assert.equal(factoryPackage.name, '@tombstonedash/factory');
  assert.match(step, /working-directory: packages\/noui-factory/);
  assert.equal(queries.length, 1, 'expected exactly one factory version query');
  assert.equal(queries[0][1], factoryPackage.name);
  assert.doesNotMatch(step, /@noui\/factory/);
});
