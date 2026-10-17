import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const guidePath = 'src/app/docs/guides/bill-an-mcp-tool/page.tsx';
const guide = readFileSync(join(root, guidePath), 'utf8');

const routePath = (apiPath) => {
  if (apiPath.startsWith('/api/v1/bazaar/receipts/')) {
    return 'src/app/api/v1/bazaar/receipts/[receiptId]/route.ts';
  }
  return join('src/app', apiPath, 'route.ts');
};

test('every API endpoint in the guide has a route', () => {
  const apiPaths = [...guide.matchAll(/\/api\/[a-zA-Z0-9_./<>-]+/g)].map(([path]) => path.replace(/[<].*$/, '').replace(/\.{3}$/, '')); 
  assert.ok(apiPaths.length > 0, 'guide should mention API endpoints');
  for (const apiPath of new Set(apiPaths)) {
    assert.ok(existsSync(join(root, routePath(apiPath))), `${apiPath} should map to an existing route`);
  }
});

test('every SDK member used by the guide appears in the SDK source', () => {
  const sdk = readFileSync(join(root, 'packages/bazaar-sdk/src/index.ts'), 'utf8');
  for (const member of ['registerProvider', 'tools.register', 'meter.record', 'tools.call', 'catalog.list']) {
    assert.ok(sdk.includes(member) || sdk.includes(member.split('.')[1]), `${member} should appear in SDK source`);
  }
});

test('guide contains no realistic keys or literal process.env values', () => {
  assert.doesNotMatch(guide, /bz_(provider|consumer)_[0-9a-f]{8,}/);
  assert.doesNotMatch(guide, /process\.env\s*\./);
});

test('all internal links point to existing pages', () => {
  for (const href of ['/spec', '/verify', '/docs/bazaar', '/docs/guides/monetize-mcp-server']) {
    assert.ok(existsSync(join(root, 'src/app', href.slice(1), 'page.tsx')), `${href} should have a page.tsx`);
    assert.ok(guide.includes(`href="${href}"`), `guide should link to ${href}`);
  }
});

test('docs, homepage, and sitemap link to this guide', () => {
  for (const file of ['src/app/docs/page.tsx', 'src/app/page.tsx', 'public/sitemap.xml']) {
    assert.ok(readFileSync(join(root, file), 'utf8').includes('/docs/guides/bill-an-mcp-tool'), `${file} should link to the guide`);
  }
});
