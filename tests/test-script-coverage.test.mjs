import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

test("npm test runs every test file in tests/", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const globs = pkg.scripts.test
    .split(/\s+/)
    .filter((part) => part.startsWith("tests/"))
    .map((glob) => new RegExp(`^${glob.replace("tests/", "").replace(/\./g, "\\.").replace("*", "[^/]*")}$`));

  const testFiles = readdirSync(new URL("./", import.meta.url)).filter((name) => /\.test\.[a-z]+$/.test(name));
  assert.ok(testFiles.length > 0);
  const skipped = testFiles.filter((name) => !globs.some((glob) => glob.test(name)));
  assert.deepEqual(skipped, [], "test files outside the npm test globs never run in CI");
});

test("the bazaar-sdk test script runs every SDK test file", () => {
  const sdk = new URL("../packages/bazaar-sdk/", import.meta.url);
  const script = readFileSync(new URL("scripts/test.sh", sdk), "utf8");
  // scripts/test.sh compiles src/*.test.ts with tsc and runs the output.
  assert.match(script, /src\/\*\.test\.ts/);

  const find = (dir, prefix = "") => readdirSync(new URL(dir, sdk), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "dist") return [];
    const path = `${prefix}${entry.name}`;
    return entry.isDirectory() ? find(`${dir}${entry.name}/`, `${path}/`) : [path];
  });
  const testFiles = find("./").filter((path) => /\.test\.[a-z]+$/.test(path));
  assert.ok(testFiles.length > 0);
  const skipped = testFiles.filter((path) => !/^src\/[^/]+\.test\.ts$/.test(path));
  assert.deepEqual(skipped, [], "SDK test files outside src/*.test.ts never run in CI");
});
