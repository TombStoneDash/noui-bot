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
