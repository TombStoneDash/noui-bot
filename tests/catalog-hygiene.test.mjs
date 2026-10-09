import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DENYLIST_PROVIDER_IDS,
  isTestArtifactProvider,
  filterCatalogRows,
  countRealProviders,
} from "../src/lib/catalog-hygiene.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const rows = JSON.parse(await read("./fixtures/catalog.rows.json"));

test("filters artifacts and orphans, preserving the four real rows in input order", () => {
  const before = structuredClone(rows);
  assert.equal(rows.length, 9);
  assert.deepEqual(filterCatalogRows(rows), rows.slice(5));
  assert.deepEqual(rows, before);
  assert.equal(countRealProviders(rows), 2);
  assert.deepEqual(filterCatalogRows([]), []);
  assert.equal(countRealProviders([]), 0);
  assert.equal(countRealProviders([{ bazaar_providers: {} }]), 0);
});

for (const [label, provider] of [
  ["denylist id", { id: DENYLIST_PROVIDER_IDS[0] }],
  ["placeholder hash", { api_key_hash: "seed_placeholder_only" }],
  ["seed prefix", { api_key_prefix: "bz_seed_only" }],
  ...["Test Provider", "TESTING Tools", "Demo API", "Dummy Data", "Sample Tools", "Example Service", "Acme test-provider", "Acme test_server", "Acme test artifact", "Acme testprovider"].map((name) => [name, { name }]),
  ...["ops@example.com", "ops@example.org", "ops@test.com", "OPS@EXAMPLE.COM"].map((email) => [email, { email }]),
  ...["http://localhost:3000/mcp", "http://127.0.0.1/mcp", "https://api.example.com/mcp", "https://api.local/mcp", "https://api.test/mcp"].map((endpoint_url) => [endpoint_url, { endpoint_url }]),
  ["null provider", null],
  ["missing provider", undefined],
]) {
  test(`isolated artifact signal: ${label}`, () => {
    assert.equal(isTestArtifactProvider(provider), true);
  });
}

test("realistic providers and word-boundary neighbors are retained", () => {
  const real = rows[5].bazaar_providers;
  assert.equal(isTestArtifactProvider(real), false);
  for (const name of ["Testament Data", "Contest Tools"]) {
    assert.equal(isTestArtifactProvider({ name }), false);
  }
  for (const endpoint_url of ["https://localhost.tools/mcp", "https://public.io/local.test", "invalid-url"]) {
    assert.equal(isTestArtifactProvider({ endpoint_url }), false);
  }
});

for (const path of [
  "src/app/api/bazaar/catalog/route.ts",
  "src/app/api/v1/bazaar/pricing/route.ts",
  "src/app/api/v1/bazaar/stats/route.ts",
]) {
  test(`${path} uses the shared hygiene filter`, async () => {
    const source = await read(`../${path}`);
    assert.match(source, /import\s*\{[^}]*filterCatalogRows[^}]*\}\s*from\s*["']@\/lib\/catalog-hygiene["']/);
    assert.match(source, /filterCatalogRows\(tools \|\| \[\]\)/);
  });
}

test("catalog filters before pagination and keeps sensitive fields out of its response mapping", async () => {
  const source = await read("../src/app/api/bazaar/catalog/route.ts");
  assert.doesNotMatch(source, /\.range\(/);
  assert.match(source, /filtered\.slice\(offset, offset \+ limit\)\.map/);
  assert.match(source, /total: filtered\.length/);
  assert.match(source, /providers: countRealProviders\(filtered\)/);
  const response = source.slice(source.indexOf("tools: filtered.slice"));
  assert.doesNotMatch(response, /api_key_hash|api_key_prefix|email/);
  assert.match(response, /provider:\s*\{\s*id: provider\?\.id,\s*name: provider\?\.name,\s*verified: provider\?\.verified,\s*\}/);
});
