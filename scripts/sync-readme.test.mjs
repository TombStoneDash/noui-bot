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
  assert.match(
    migrated,
    /\| Beta &#124; Labs \| No \| 1 \| <code>beta\.lookup<\/code> \|/,
  );
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

function makeCatalog(size) {
  return Array.from({ length: size }, (_, index) => ({
    id: `tool-${String(index).padStart(6, "0")}`,
    tool_name: `tool.${String(index).padStart(6, "0")}`,
    provider: {
      id: "provider-large",
      name: "Large Provider",
      verified: true,
    },
  }));
}

function pageLengthTotalFetch(catalog, requests) {
  return async (url) => {
    const limit = Number(url.searchParams.get("limit"));
    const offset = Number(url.searchParams.get("offset"));
    requests.push(offset);
    const page = catalog.slice(offset, offset + limit);
    return new Response(
      JSON.stringify({
        tools: page,
        total: page.length,
        limit,
        offset,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

for (const [size, expectedOffsets] of [
  [100, [0, 100]],
  [101, [0, 100]],
  [200, [0, 100, 200]],
  [201, [0, 100, 200]],
]) {
  test(`paginates ${size} tools when total is only the page length`, async () => {
    const catalog = makeCatalog(size);
    const requests = [];
    const fetched = await fetchCatalog(
      "https://example.test/catalog",
      pageLengthTotalFetch(catalog, requests),
    );

    assert.deepEqual(fetched, catalog);
    assert.deepEqual(requests, expectedOffsets);
  });
}

test("rejects repeated pages and an unbounded stream of unique full pages", async () => {
  const page = makeCatalog(100);
  await assert.rejects(
    fetchCatalog("https://example.test/catalog", async (url) => {
      const limit = Number(url.searchParams.get("limit"));
      const offset = Number(url.searchParams.get("offset"));
      return new Response(
        JSON.stringify({ tools: page, total: page.length, limit, offset }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
    /duplicate tool id tool-000000 across catalog pages/,
  );

  await assert.rejects(
    fetchCatalog("https://example.test/catalog", async (url) => {
      const limit = Number(url.searchParams.get("limit"));
      const offset = Number(url.searchParams.get("offset"));
      const endlessPage = Array.from({ length: limit }, (_, pageIndex) => ({
        id: `endless-${offset + pageIndex}`,
        tool_name: `endless.${offset + pageIndex}`,
        provider: {
          id: "endless-provider",
          name: "Endless Provider",
          verified: false,
        },
      }));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          tools: endlessPage,
          total: endlessPage.length,
          limit,
          offset,
        }),
      };
    }),
    /catalog exceeds maximum 100000 tools/,
  );
});

test("sanitizes catalog-controlled markers and table metacharacters", () => {
  const hostileCatalog = [
    {
      id: "hostile-tool",
      tool_name:
        "tool <!-- CATALOG:BEGIN --> | line\nslash\\ <!-- attacker -->",
      provider: {
        id: "hostile-provider",
        name:
          "Provider <!-- CATALOG:END --> | line\r\nslash\\ <!-- attacker -->",
        verified: false,
      },
    },
  ];
  const block = renderCatalogBlock(
    summarizeCatalog(hostileCatalog),
    "2026-07-29",
    "https://example.test/catalog",
  );
  const firstWrite = updateReadme(
    "# Product\n\n**Live now:** 1 tool · 1 provider\n",
    block,
  );
  const secondWrite = updateReadme(firstWrite, block);

  assert.equal(firstWrite, secondWrite);
  assert.equal(firstWrite.split("<!-- CATALOG:BEGIN -->").length - 1, 1);
  assert.equal(firstWrite.split("<!-- CATALOG:END -->").length - 1, 1);
  assert.doesNotMatch(firstWrite, /<!-- attacker -->/);
  assert.match(firstWrite, /&lt;!-- CATALOG:BEGIN --&gt;/);
  assert.match(firstWrite, /&lt;!-- CATALOG:END --&gt;/);
  assert.match(firstWrite, /&#124;/);
  assert.match(firstWrite, /&#10;/);
  assert.match(firstWrite, /&#13;/);
  assert.match(firstWrite, /&#92;/);

  const providerRow = firstWrite
    .split("\n")
    .find((line) => line.startsWith("| Provider &lt;!--"));
  assert.ok(providerRow);
  assert.equal(providerRow.split("|").length - 1, 5);
  assert.doesNotMatch(providerRow, /\\/);
});
