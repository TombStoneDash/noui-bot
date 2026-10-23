import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  ts = createRequire(new URL("../packages/noui-factory/package.json", import.meta.url))("typescript");
}

async function compile(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    fileName: "module.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const libSource = await compile("../src/lib/public-url.ts");
const routeSource = await compile("../src/app/api/validate-humans-txt/route.ts");

function loadLib() {
  const context = vm.createContext({ exports: {}, URL, require });
  vm.runInContext(libSource, context);
  return context.exports;
}

function loadRoute(fetch) {
  const lib = loadLib();
  const context = vm.createContext({
    exports: {},
    AbortController,
    Error,
    URL,
    fetch,
    setTimeout,
    clearTimeout,
    require(name) {
      if (name === "@/lib/public-url") return lib;
      assert.equal(name, "next/server");
      return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    },
  });
  vm.runInContext(routeSource, context);
  return (url) =>
    context.exports.GET({ nextUrl: new URL(`https://validator.example/api?url=${encodeURIComponent(url)}`) });
}

const { isBlockedAddress, checkPublicUrl } = loadLib();

test("private, loopback, link-local and reserved addresses are blocked", () => {
  for (const ip of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255",
    "::", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "64:ff9b::a9fe:a9fe",
    "fc00::1", "fd12:3456::1", "fe80::1", "fe80::1%lo0", "ff02::1", "2001:db8::1", "not-an-ip",
  ]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
});

test("public addresses are allowed", () => {
  for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test("checkPublicUrl rejects bad schemes, credentials, localhost and private DNS answers", async () => {
  const resolve = async (host) => (host === "internal.example" ? [{ address: "93.184.216.34" }, { address: "10.0.0.5" }] : [{ address: "93.184.216.34" }]);
  for (const input of [
    "foo",
    "file:///etc/passwd",
    "ftp://example.com/humans.txt",
    "https://user:pw@example.com/",
    "http://localhost:3000/",
    "http://api.localhost/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "https://internal.example/.well-known/humans.txt",
  ]) {
    const result = await checkPublicUrl(input, resolve);
    assert.equal(result.ok, false, input);
  }
  const ok = await checkPublicUrl("https://example.com/.well-known/humans.txt", resolve);
  assert.equal(ok.ok, true);
  assert.equal(ok.url.href, "https://example.com/.well-known/humans.txt");
});

test("checkPublicUrl fails closed when DNS lookup fails", async () => {
  const result = await checkPublicUrl("https://nx.example/", async () => {
    throw new Error("ENOTFOUND");
  });
  assert.deepEqual({ ...result }, { ok: false, reason: "url host could not be resolved" });
});

test("route returns 400 without fetching internal or malformed targets", async () => {
  const calls = [];
  const get = loadRoute(async (url) => {
    calls.push(url);
    return Response.json({});
  });
  for (const input of ["foo", "http://127.0.0.1:5432/", "http://169.254.169.254/latest/meta-data/", "file:///etc/passwd"]) {
    const response = await get(input);
    assert.equal(response.status, 400, input);
    assert.equal(typeof (await response.json()).error, "string");
  }
  assert.deepEqual(calls, []);
});

test("route refuses a redirect into a private network", async () => {
  const calls = [];
  const get = loadRoute(async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 302, headers: { location: "http://10.0.0.1/admin" } });
  });
  const response = await get("https://93.184.216.34/.well-known/humans.txt");
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /Redirect rejected/);
  assert.deepEqual(calls, ["https://93.184.216.34/.well-known/humans.txt"]);
});

test("route follows public redirects and stops after three", async () => {
  const calls = [];
  const get = loadRoute(async (url) => {
    calls.push(url);
    if (url.endsWith("/final")) return Response.json({ name: "ok" });
    return new Response(null, { status: 301, headers: { location: "/final" } });
  });
  const response = await get("https://93.184.216.34/start");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: "ok" });
  assert.deepEqual(calls, ["https://93.184.216.34/start", "https://93.184.216.34/final"]);

  const loop = loadRoute(async () => new Response(null, { status: 302, headers: { location: "/again" } }));
  const looped = await loop("https://93.184.216.34/again");
  assert.equal(looped.status, 502);
  assert.equal((await looped.json()).error, "Too many redirects");
});
