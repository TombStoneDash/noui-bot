#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_CATALOG_URL = "https://noui.bot/api/bazaar/catalog";
const DEFAULT_README_PATH = "README.md";
const START_MARKER = "<!-- CATALOG:BEGIN -->";
const END_MARKER = "<!-- CATALOG:END -->";
const PAGE_LIMIT = 100;
const MAX_CATALOG_TOOLS = 100_000;
const MAX_PAGE_REQUESTS = Math.ceil(MAX_CATALOG_TOOLS / PAGE_LIMIT) + 1;

function fail(message) {
  throw new Error(`README catalog sync failed: ${message}`);
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${field} must be a non-empty string`);
  }

  return value.trim();
}

function markdownCell(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("`", "&#96;")
    .replaceAll("\\", "&#92;")
    .replaceAll("|", "&#124;")
    .replace(/[\u0000-\u001f\u007f]/g, (character) => {
      return `&#${character.codePointAt(0)};`;
    });
}

function inlineCode(value) {
  return `<code>${markdownCell(value)}</code>`;
}

export function summarizeCatalog(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    fail("catalog must contain at least one tool");
  }

  const toolIds = new Set();
  const providers = new Map();

  for (const [index, tool] of tools.entries()) {
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
      fail(`tools[${index}] must be an object`);
    }

    const toolId = requireString(tool.id, `tools[${index}].id`);
    const toolName = requireString(
      tool.tool_name,
      `tools[${index}].tool_name`,
    );

    if (toolIds.has(toolId)) {
      fail(`duplicate tool id ${toolId}`);
    }
    toolIds.add(toolId);

    if (
      !tool.provider ||
      typeof tool.provider !== "object" ||
      Array.isArray(tool.provider)
    ) {
      fail(`tools[${index}].provider must be an object`);
    }

    const providerId = requireString(
      tool.provider.id,
      `tools[${index}].provider.id`,
    );
    const providerName = requireString(
      tool.provider.name,
      `tools[${index}].provider.name`,
    );

    if (typeof tool.provider.verified !== "boolean") {
      fail(`tools[${index}].provider.verified must be a boolean`);
    }

    const existing = providers.get(providerId);
    if (existing) {
      if (
        existing.name !== providerName ||
        existing.verified !== tool.provider.verified
      ) {
        fail(`provider ${providerId} has inconsistent metadata`);
      }
      existing.tools.push(toolName);
    } else {
      providers.set(providerId, {
        id: providerId,
        name: providerName,
        verified: tool.provider.verified,
        tools: [toolName],
      });
    }
  }

  const providerRows = [...providers.values()]
    .map((provider) => ({
      ...provider,
      tools: provider.tools.toSorted((left, right) =>
        left.localeCompare(right, "en"),
      ),
    }))
    .toSorted(
      (left, right) =>
        left.name.localeCompare(right.name, "en") ||
        left.id.localeCompare(right.id, "en"),
    );

  return {
    toolCount: tools.length,
    providerCount: providerRows.length,
    providers: providerRows,
  };
}

function validatePage(payload, expectedOffset) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail("catalog response must be an object");
  }

  if (!Array.isArray(payload.tools)) {
    fail("catalog response tools must be an array");
  }

  if (
    payload.total !== undefined &&
    (!Number.isSafeInteger(payload.total) || payload.total < 0)
  ) {
    fail("catalog response total must be a non-negative integer");
  }

  if (
    payload.limit !== undefined &&
    payload.limit !== null &&
    payload.limit !== PAGE_LIMIT
  ) {
    fail(
      `catalog response limit ${payload.limit} did not match requested ${PAGE_LIMIT}`,
    );
  }

  if (payload.tools.length > PAGE_LIMIT) {
    fail(
      `catalog returned ${payload.tools.length} tools for page limit ${PAGE_LIMIT}`,
    );
  }

  if (
    payload.offset !== undefined &&
    payload.offset !== null &&
    payload.offset !== expectedOffset
  ) {
    fail(
      `catalog response offset ${payload.offset} did not match requested ${expectedOffset}`,
    );
  }

  return payload;
}

export async function fetchCatalog(
  catalogUrl = DEFAULT_CATALOG_URL,
  fetchImpl = globalThis.fetch,
) {
  if (typeof fetchImpl !== "function") {
    fail("Fetch API is unavailable");
  }

  const endpoint = new URL(catalogUrl);
  if (endpoint.searchParams.has("offset")) {
    fail("catalog URL must not set an offset");
  }

  endpoint.searchParams.set("limit", String(PAGE_LIMIT));

  const tools = [];
  const toolIds = new Set();
  let offset = 0;

  for (let requestCount = 0; requestCount < MAX_PAGE_REQUESTS; requestCount += 1) {
    endpoint.searchParams.set("offset", String(offset));
    const response = await fetchImpl(endpoint, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      fail(`catalog returned HTTP ${response.status}`);
    }

    let payload;
    try {
      payload = validatePage(await response.json(), offset);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("README catalog")) {
        throw error;
      }
      fail(`catalog returned invalid JSON: ${error}`);
    }

    if (payload.tools.length === 0) {
      return tools;
    }

    if (tools.length + payload.tools.length > MAX_CATALOG_TOOLS) {
      fail(`catalog exceeds maximum ${MAX_CATALOG_TOOLS} tools`);
    }

    for (const [index, tool] of payload.tools.entries()) {
      if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
        fail(`catalog page at offset ${offset} tools[${index}] must be an object`);
      }

      const toolId = requireString(
        tool.id,
        `catalog page at offset ${offset} tools[${index}].id`,
      );
      if (toolIds.has(toolId)) {
        fail(`duplicate tool id ${toolId} across catalog pages`);
      }
      toolIds.add(toolId);
    }

    tools.push(...payload.tools);
    offset += payload.tools.length;

    if (payload.tools.length < PAGE_LIMIT) {
      return tools;
    }
  }

  fail(`catalog pagination exceeded ${MAX_PAGE_REQUESTS} requests`);
}

export function renderCatalogBlock(summary, generatedDate, catalogUrl) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedDate)) {
    fail("generated date must use YYYY-MM-DD");
  }

  const rows = summary.providers.map((provider) => {
    const tools = provider.tools.map(inlineCode).join(", ");
    return `| ${markdownCell(provider.name)} | ${provider.verified ? "Yes" : "No"} | ${provider.tools.length} | ${tools} |`;
  });
  const normalizedCatalogUrl = new URL(catalogUrl).href
    .replaceAll("<", "%3C")
    .replaceAll(">", "%3E")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");

  return [
    START_MARKER,
    `**Live catalog:** ${summary.toolCount} tools · ${summary.providerCount} providers · 10% platform fee · Sub-cent metering · Stripe Connect payouts`,
    "",
    `_Generated from [the public catalog](<${normalizedCatalogUrl}>) on ${generatedDate} UTC._`,
    "",
    "| Provider | Verified | Tool count | Tools |",
    "|---|:---:|---:|---|",
    ...rows,
    END_MARKER,
  ].join("\n");
}

export function updateReadme(readme, block) {
  const startCount = readme.split(START_MARKER).length - 1;
  const endCount = readme.split(END_MARKER).length - 1;

  if (startCount === 1 && endCount === 1) {
    const start = readme.indexOf(START_MARKER);
    const end = readme.indexOf(END_MARKER, start) + END_MARKER.length;
    if (end <= start) {
      fail("catalog markers are out of order");
    }
    return `${readme.slice(0, start)}${block}${readme.slice(end)}`;
  }

  if (startCount !== 0 || endCount !== 0) {
    fail("README must contain either one complete marker pair or no markers");
  }

  const legacyPattern = /^\*\*Live now:\*\* .+$/gm;
  const legacyMatches = [...readme.matchAll(legacyPattern)];
  if (legacyMatches.length !== 1) {
    fail(
      `README without markers must contain exactly one legacy Live now line; found ${legacyMatches.length}`,
    );
  }

  return readme.replace(legacyPattern, block);
}

function parseArgs(argv) {
  const options = {
    catalogUrl: DEFAULT_CATALOG_URL,
    readmePath: DEFAULT_README_PATH,
    generatedDate: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!["--catalog-url", "--readme", "--date"].includes(flag) || !value) {
      fail(`unknown or incomplete argument ${flag}`);
    }

    if (flag === "--catalog-url") options.catalogUrl = value;
    if (flag === "--readme") options.readmePath = value;
    if (flag === "--date") options.generatedDate = value;
    index += 1;
  }

  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const tools = await fetchCatalog(options.catalogUrl);
  const summary = summarizeCatalog(tools);
  const block = renderCatalogBlock(
    summary,
    options.generatedDate,
    options.catalogUrl,
  );
  const currentReadme = await readFile(options.readmePath, "utf8");
  const nextReadme = updateReadme(currentReadme, block);
  const changed = nextReadme !== currentReadme;

  if (changed) {
    await writeFile(options.readmePath, nextReadme, "utf8");
  }

  process.stdout.write(
    `${changed ? "updated" : "unchanged"} ${options.readmePath}: ${summary.toolCount} tools, ${summary.providerCount} providers\n`,
  );
}

const entrypoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (entrypoint === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
