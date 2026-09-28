import assert from "node:assert/strict";
import test from "node:test";

import {
  compareRawText,
  encodeMarkdownText,
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

test("uses a total platform-deterministic raw text order", () => {
  assert.equal(compareRawText("same", "same"), 0);
  assert.equal(compareRawText("e\u0301", "é"), -1);
  assert.equal(compareRawText("é", "e\u0301"), 1);
  assert.equal(compareRawText("provider-2", "provider-10"), 1);
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
    /\| Beta &#124; Labs \| No \| 1 \| <code>beta&#46;lookup<\/code> \|/,
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

test("cache-busts every page without changing the rendered catalog URL", async () => {
  const seenCacheBusts = [];
  const fetched = await fetchCatalog(
    "https://example.test/catalog",
    async (url) => {
      seenCacheBusts.push(url.searchParams.get("_sync"));
      const limit = Number(url.searchParams.get("limit"));
      const offset = Number(url.searchParams.get("offset"));
      const page = tools.slice(offset, offset + limit);
      return new Response(
        JSON.stringify({ tools: page, total: page.length, limit, offset }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
    "fixed-cache-bust",
  );

  assert.deepEqual(fetched, tools);
  assert.deepEqual(seenCacheBusts, ["fixed-cache-bust"]);
  const block = renderCatalogBlock(
    summarizeCatalog(fetched),
    "2026-07-29",
    "https://example.test/catalog",
  );
  assert.match(block, /\(<https:\/\/example\.test\/catalog>\)/);
  assert.doesNotMatch(block, /fixed-cache-bust/);
});

test("encodes every ASCII Markdown punctuation character readably", () => {
  const punctuation = Array.from({ length: 94 }, (_, index) =>
    String.fromCodePoint(index + 33),
  )
    .filter((character) => !/[0-9A-Za-z]/.test(character))
    .join("");
  const expected = [...punctuation]
    .map((character) =>
      character === "@"
        ? "<span>&#64;</span>"
        : `&#${character.codePointAt(0)};`,
    )
    .join("");
  const encoded = encodeMarkdownText(punctuation);

  assert.equal(encoded, expected);
  assert.equal(
    encoded
      .replaceAll("<span>", "")
      .replaceAll("</span>", "")
      .replace(/&#(\d+);/g, (_, codePoint) =>
        String.fromCodePoint(Number(codePoint)),
      ),
    punctuation,
  );
});

test("sanitizes a broad catalog-controlled Markdown and HTML matrix", () => {
  const hostileValues = [
    "![pixel](https://tracker.example/pixel)",
    "[link](https://evil.example/path)",
    "[reference][target]",
    "<https://evil.example/autolink>",
    "<user@evil.example>",
    "<img src=\"https://evil.example/pixel\">",
    "<script>location='https://evil.example'</script>",
    "https://evil.example/raw",
    "www.evil.example",
    "user@evil.example",
    "**bold** _emphasis_ ~~strike~~ `code`",
    "<!-- CATALOG:END -->",
    "&lt;img src=x&gt;",
    "pipe|line\nnext\rslash\\",
  ];
  const hostileCatalog = [
    ...hostileValues.map((value, index) => ({
      id: `hostile-tool-${index}`,
      tool_name: value,
      provider: {
        id: "hostile-provider",
        name: hostileValues.join(" "),
        verified: false,
      },
    })),
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
  const providerRow = firstWrite
    .split("\n")
    .find((line) => line.startsWith("| &#33;&#91;pixel"));
  assert.ok(providerRow);
  assert.doesNotMatch(providerRow, /!\[|\]\(|<!--|<img|<script|https?:\/\//);
  assert.doesNotMatch(providerRow, /www\.|[A-Za-z0-9]@[A-Za-z0-9]/);
  assert.match(providerRow, /&#33;&#91;pixel&#93;&#40;https&#58;&#47;&#47;/);
  assert.match(providerRow, /&#60;&#33;&#45;&#45; CATALOG&#58;END/);
  assert.match(providerRow, /<span>&#64;<\/span>/);
  assert.match(firstWrite, /&#124;/);
  assert.match(firstWrite, /&#10;/);
  assert.match(firstWrite, /&#13;/);
  assert.match(firstWrite, /&#92;/);
  assert.equal(providerRow.split("|").length - 1, 5);
  assert.doesNotMatch(providerRow, /\\/);
});

test("reversed API order is byte-identical for collation-equal strings", () => {
  const canonicalProvider = {
    id: "provider-canonical",
    name: "Canonical Provider",
    verified: true,
  };
  const catalog = [
    {
      id: "tool-precomposed",
      tool_name: "é",
      provider: canonicalProvider,
    },
    {
      id: "tool-decomposed",
      tool_name: "e\u0301",
      provider: canonicalProvider,
    },
    {
      id: "tool-same-z",
      tool_name: "same",
      provider: canonicalProvider,
    },
    {
      id: "tool-same-a",
      tool_name: "same",
      provider: canonicalProvider,
    },
    {
      id: "provider-tool-precomposed",
      tool_name: "zeta",
      provider: {
        id: "provider-precomposed",
        name: "é",
        verified: false,
      },
    },
    {
      id: "provider-tool-decomposed",
      tool_name: "alpha",
      provider: {
        id: "provider-decomposed",
        name: "e\u0301",
        verified: false,
      },
    },
    {
      id: "provider-tool-equal-z",
      tool_name: "zulu",
      provider: {
        id: "provider-equal-z",
        name: "Equal Provider",
        verified: false,
      },
    },
    {
      id: "provider-tool-equal-a",
      tool_name: "alpha",
      provider: {
        id: "provider-equal-a",
        name: "Equal Provider",
        verified: false,
      },
    },
  ];
  const render = (items) =>
    renderCatalogBlock(
      summarizeCatalog(items),
      "2026-07-29",
      "https://example.test/catalog",
    );

  assert.equal("é".localeCompare("e\u0301", "en"), 0);
  assert.equal(render(catalog), render([...catalog].reverse()));
});
