import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCatalog,
  renderCatalogBlock,
  summarizeCatalog,
  updateReadme,
} from "./sync-readme.mjs";

const tools = [
  {
    id: "tool-b",
    tool_name: "beta.lookup",
    provider: { id: "provider-b", name: "Beta | Labs", verified: false },
  },
  {
    id: "tool-a2",
    tool_name: "alpha.write",
    provider: { id: "provider-a", name: "Alpha Labs", verified: true },
  },
  {
    id: "tool-a1",
    tool_name: "alpha.read",
    provider: { id: "provider-a", name: "Alpha Labs", verified: true },
  },
];

test("summarizes providers and tools deterministically", () => {
  assert.deepEqual(summarizeCatalog(tools), {
    toolCount: 3,
    providerCount: 2,
    providers: [
      {
        id: "provider-a",
        name: "Alpha Labs",
        verified: true,
        tools: ["alpha.read", "alpha.write"],
      },
      {
        id: "provider-b",
        name: "Beta | Labs",
        verified: false,
        tools: ["beta.lookup"],
      },
    ],
  });
});

test("rejects duplicate tools and inconsistent provider metadata", () => {
  assert.throws(
    () => summarizeCatalog([...tools, tools[0]]),
    /duplicate tool id tool-b/,
  );

  assert.throws(
    () =>
      summarizeCatalog([
        tools[0],
        {
          id: "tool-c",
          tool_name: "beta.other",
          provider: {
            id: "provider-b",
            name: "Renamed Beta",
            verified: false,
          },
        },
      ]),
    /provider provider-b has inconsistent metadata/,
  );
});

test("migrates the legacy line and is idempotent after markers exist", () => {
  const original = [
    "# Product",
    "",
    "**Live now:** 14 tools · 6 providers · old text",
    "",
    "After",
  ].join("\n");
  const summary = summarizeCatalog(tools);
  const block = renderCatalogBlock(
    summary,
    "2026-07-29",
    "https://example.test/catalog",
  );
  const migrated = updateReadme(original, block);

  assert.match(migrated, /<!-- CATALOG:BEGIN -->/);
  assert.match(migrated, /\*\*Live catalog:\*\* 3 tools · 2 providers/);
  assert.match(migrated, /\| Beta \\\| Labs \| No \| 1 \| `beta\.lookup` \|/);
  assert.equal(updateReadme(migrated, block), migrated);
});

test("fails closed on partial or duplicate README markers", () => {
  assert.throws(
    () => updateReadme(`before\n<!-- CATALOG:BEGIN -->\nafter`, "block"),
    /one complete marker pair or no markers/,
  );
  assert.throws(
    () =>
      updateReadme(
        "**Live now:** first\n\n**Live now:** second",
        "replacement",
      ),
    /exactly one legacy Live now line; found 2/,
  );
});

test("paginates the catalog and rejects a changing total", async () => {
  const requests = [];
  const fakeFetch = async (url) => {
    const offset = Number(url.searchParams.get("offset"));
    requests.push(offset);
    const page = offset === 0 ? tools.slice(0, 2) : tools.slice(2);
    return new Response(
      JSON.stringify({ tools: page, total: tools.length, offset }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  assert.deepEqual(
    await fetchCatalog("https://example.test/catalog", fakeFetch),
    tools,
  );
  assert.deepEqual(requests, [0, 2]);

  await assert.rejects(
    fetchCatalog("https://example.test/catalog", async (url) => {
      const offset = Number(url.searchParams.get("offset"));
      const total = offset === 0 ? 3 : 4;
      return new Response(
        JSON.stringify({ tools: tools.slice(offset, offset + 2), total, offset }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
    /catalog total changed during pagination/,
  );
});
