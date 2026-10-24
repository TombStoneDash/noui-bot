import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test, { beforeEach } from "node:test";
import { NextRequest } from "next/server.js";
import { _resetForTests, resolveBucket, ROUTE_LIMITS } from "../src/lib/rate-limit.ts";
import { PLANS } from "../src/lib/subscription.ts";

// middleware.ts imports "./lib/rate-limit" without an extension (bundler style).
const middlewareUrl = new URL("../src/middleware.ts", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === middlewareUrl && specifier === "./lib/rate-limit") {
      return nextResolve("./lib/rate-limit.ts", context);
    }
    if (context.parentURL === middlewareUrl && specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    return nextResolve(specifier, context);
  },
});
const { middleware } = await import("../src/middleware.ts");
hooks.deregister();

beforeEach(() => _resetForTests());

function request(path, { method = "POST", ip = "203.0.113.7", headers = {} } = {}) {
  return new NextRequest(`https://noui.bot${path}`, {
    method,
    headers: { "x-forwarded-for": ip, ...headers },
  });
}

test("the proxy's per-IP ceiling never undercuts the highest plan's per-key RPM", () => {
  const topPlanRpm = Math.max(...Object.values(PLANS).map((plan) => plan.rpm));
  const { bucket, limit } = resolveBucket("/api/bazaar/proxy");
  assert.equal(bucket, "/api/bazaar/proxy");
  assert.ok(limit >= topPlanRpm, `proxy IP limit ${limit} < top plan rpm ${topPlanRpm}`);
});

test("a Scale-sized burst through the proxy is not cut off at the default 100/min", () => {
  for (let i = 0; i < 150; i++) {
    const res = middleware(request("/api/bazaar/proxy"));
    assert.notEqual(res.status, 429, `call ${i + 1} was rate limited by the IP limiter`);
  }
});

test("proxy and webhook traffic do not drain the shared /api bucket", () => {
  assert.equal(resolveBucket("/api/webhooks/stripe").bucket, "/api/webhooks/stripe");
  for (let i = 0; i < 200; i++) middleware(request("/api/bazaar/proxy"));
  for (let i = 0; i < 200; i++) middleware(request("/api/webhooks/stripe"));
  const res = middleware(request("/api/bazaar/catalog", { method: "GET" }));
  assert.notEqual(res.status, 429);
});

test("the default /api bucket still limits other bazaar routes", () => {
  const limit = 100;
  let last;
  for (let i = 0; i <= limit; i++) last = middleware(request("/api/bazaar/usage", { method: "GET" }));
  assert.equal(last.status, 429);
});

test("CORS preflight allows the Idempotency-Key header the proxy reads", () => {
  const res = middleware(request("/api/bazaar/proxy", {
    method: "OPTIONS",
    headers: { "access-control-request-headers": "authorization, content-type, idempotency-key" },
  }));
  assert.equal(res.status, 204);
  const allowed = res.headers.get("access-control-allow-headers").toLowerCase().split(/\s*,\s*/);
  for (const header of ["authorization", "content-type", "idempotency-key"]) {
    assert.ok(allowed.includes(header), `${header} missing from ${allowed}`);
  }
});

test("browser clients can read rate-limit and replay headers", () => {
  const ok = middleware(request("/api/bazaar/proxy"));
  const exposed = ok.headers.get("access-control-expose-headers");
  assert.match(exposed, /X-Bazaar-Idempotent-Replay/);
  assert.match(exposed, /Retry-After/);

  let limited;
  for (let i = 0; i <= ROUTE_LIMITS["/api/v1/apply"]; i++) limited = middleware(request("/api/v1/apply"));
  assert.equal(limited.status, 429);
  const limitedExposed = limited.headers.get("access-control-expose-headers");
  for (const header of ["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"]) {
    assert.match(limitedExposed, new RegExp(header));
  }
});
