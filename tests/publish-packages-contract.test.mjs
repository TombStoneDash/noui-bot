import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/publish-packages.yml', 'utf8');
const factoryPackage = JSON.parse(
  readFileSync('packages/noui-factory/package.json', 'utf8'),
);

test('SDK publication follows successful validation and preserves factory publication', () => {
  const publishStart = workflow.indexOf('\n  publish:\n');
  const testStart = workflow.indexOf('\n  test:\n');
  assert.ok(publishStart >= 0 && testStart > publishStart);
  const publishJob = workflow.slice(publishStart, testStart);
  const testJob = workflow.slice(testStart);
  assert.match(publishJob, /needs: test/, 'publication waits for validation');
  assert.match(publishJob, /Publish bazaar-sdk \(if version changed\)/);
  assert.match(publishJob, /Publish noui-factory \(if version changed\)/);
  assert.match(testJob, /working-directory: packages\/bazaar-sdk/);
  assert.match(testJob, /npm run build/);
  assert.match(testJob, /npm run typecheck/);
  const sdkValidation = workflowStep('Test bazaar-sdk');
  assert.match(sdkValidation, /npm test/);
  assert.doesNotMatch(sdkValidation, /\|\| true|continue-on-error/);
  assert.doesNotMatch(testJob, /npm\s+(?:publish|view)\b/, 'validation must never contact the package registry to publish or inspect versions');
});

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

// Execute the actual workflow shell, replacing only npm's network operations.
// node still reads the real package manifest from the workflow's directory.
for (const packageDir of ['noui-factory', 'bazaar-sdk']) {
const manifest = JSON.parse(readFileSync(`packages/${packageDir}/package.json`, 'utf8'));
for (const scenario of [
  { name: 'skips an already published version', version: manifest.version, publishes: false },
  { name: 'publishes a changed version', version: '0.0.0', publishes: true },
  { name: 'preserves the first-publication fallback', version: '', publishes: true, queryFails: true },
]) {
  test(`${packageDir} publish guard ${scenario.name}`, () => {
    const step = workflowStep(`Publish ${packageDir} (if version changed)`);
    assert.ok(step.includes(`npm view ${manifest.name} version`));
    const run = step.match(/        run: \|\n((?:          .*\n)+)/);
    assert.ok(run, 'publish step must contain a shell script');
    const script = run[1].replace(/^          /gm, '');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-e', '-c', `
      npm() {
        case "$1" in
          view)
            printf 'query:%s\\n' "$*" >&2
            if [ "$QUERY_FAILS" = 1 ]; then return 1; fi
            printf '%s\\n' "$PUBLISHED_VERSION"
            ;;
          publish) printf 'publish:%s\\n' "$*" ;;
          *) return 99 ;;
        esac
      }
      ${script}
    `], {
      cwd: new URL(`../packages/${packageDir}/`, import.meta.url),
      env: {
        ...process.env,
        PUBLISHED_VERSION: scenario.version,
        QUERY_FAILS: scenario.queryFails ? '1' : '0',
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.error?.message);
    // The workflow redirects query stderr; stdout records publish attempts only.
    const publishes = result.stdout.split('\n').filter(line => line.startsWith('publish:'));
    assert.deepEqual(publishes, scenario.publishes ? ['publish:publish --provenance --access public'] : []);
    if (!scenario.publishes) {
      assert.match(result.stdout, /version unchanged .* skipping/);
    }
  });
}
}
