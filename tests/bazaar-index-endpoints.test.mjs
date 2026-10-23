import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const apiRoot = fileURLToPath(new URL("../src/app/api/bazaar", import.meta.url));
const indexSource = readFileSync(join(apiRoot, "route.ts"), "utf8");

function routeFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return name === "route.ts" ? [path] : [];
  });
}

/** "METHOD /api/bazaar/..." for every handler a route file exports. */
const implemented = routeFiles(apiRoot).flatMap((file) => {
  const dir = relative(apiRoot, file).split(sep).slice(0, -1).join("/");
  const path = `/api/bazaar${dir ? `/${dir}` : ""}`;
  const methods = [...readFileSync(file, "utf8").matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b|export\s*\{\s*(GET|POST|PUT|PATCH|DELETE)\b/g)]
    .map((m) => m[1] ?? m[2]);
  return methods.map((method) => `${method} ${path}`);
}).sort();

const documented = [...indexSource.matchAll(/"(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/bazaar[^"]*)":/g)]
  .map((m) => `${m[1]} ${m[2]}`).sort();

test("GET /api/bazaar documents exactly the handlers that exist", () => {
  assert.ok(implemented.length > 10, "found the Bazaar route files");
  assert.deepEqual(documented, implemented);
});

test("GET /api/bazaar lists each endpoint once", () => {
  assert.equal(new Set(documented).size, documented.length);
});
