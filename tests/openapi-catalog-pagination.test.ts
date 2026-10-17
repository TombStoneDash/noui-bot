import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require(require.resolve("typescript", {
  paths: ["../", "../packages/noui-factory/"].map((path) => fileURLToPath(new URL(path, import.meta.url))),
}));

const source = await readFile(new URL("../src/app/api/openapi.json/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const exports = {};
vm.runInNewContext(outputText, {
  exports,
  require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    throw new Error(`Unexpected dependency: ${name}`);
  },
}, { filename: "openapi.json/route.js" });

test("OpenAPI GET documents the catalog pagination contract", async () => {
  const response = await exports.GET();
  assert.equal(response.status, 200);
  const spec = await response.json();
  const operation = spec.paths["/api/bazaar/catalog"].get;
  assert.equal(operation.operationId, "getBazaarCatalog");
  assert.match(operation.description, /page/i);

  assert.deepEqual(operation.parameters.map(({ name }) => name), ["limit", "offset", "category"]);
  for (const parameter of operation.parameters) {
    assert.equal(parameter.in, "query", `${parameter.name} location`);
    assert.equal(parameter.required, false, `${parameter.name} optionality`);
  }

  const [limit, offset, category] = operation.parameters;
  assert.equal(limit.schema.type, "integer");
  assert.equal(limit.schema.minimum, 1);
  assert.equal(limit.schema.default, 50);
  assert.equal(limit.schema.maximum, undefined, "values above 100 are accepted and clamped");
  assert.match(limit.description, /positive safe integer/i);
  assert.match(limit.description, /digits only/i);
  assert.match(limit.description, /above 100 are clamped.*100/i);

  assert.equal(offset.schema.type, "integer");
  assert.equal(offset.schema.minimum, 0);
  assert.equal(offset.schema.default, 0);
  assert.match(offset.description, /nonnegative safe integer/i);
  assert.match(offset.description, /digits only/i);
  assert.match(offset.description, /offset plus the effective limit minus 1 exceeds the maximum safe integer/i);

  assert.equal(category.schema.type, "string");
  assert.match(category.description, /filter tools by category/i);

  const properties = operation.responses["200"].content["application/json"].schema.properties;
  for (const name of ["tools", "total", "limit", "offset"]) {
    assert.ok(properties[name], `${name} response property`);
  }
  assert.equal(properties.limit.type, "integer");
  assert.equal(properties.offset.type, "integer");
  assert.match(properties.total.description, /returned page/i);
  assert.match(properties.total.description, /not the full catalog count/i);

  const invalid = operation.responses["400"];
  assert.match(invalid.description, /invalid limit or offset/i);
  assert.match(invalid.description, /pagination range.*overflow/i);
  assert.equal(invalid.content["application/json"].schema.properties.error.type, "boolean");
  assert.equal(invalid.content["application/json"].schema.properties.message.type, "string");
});
