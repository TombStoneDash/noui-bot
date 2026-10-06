import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Bazaar } from "./index";

// Execute the actual API handlers behind the SDK without network or database access.
// Resolve TypeScript from this package, since the test runner compiles into /tmp.
const ts: typeof import("typescript") = createRequire(resolve("package.json"))("typescript");

function route(name: string, cents: number) {
  const inserts: Record<string, Record<string, unknown>> = {};
  let signed: Record<string, unknown> | undefined;
  const tool = {
    id: "tool-test", tool_name: "test.tool", provider_id: "provider-test",
    price_cents_override: cents, bazaar_providers: { default_price_cents: 2 },
  };
  const sb = {
    from(table: string) {
      const result = {
        data: table === "bazaar_tools" ? [tool] : [{ cost_cents: cents }],
        count: 1, error: null,
      };
      const query = {
        ...result,
        select: () => query, eq: () => query, order: () => query,
        not: () => query, limit: () => query,
        single: async () => ({ data: tool, error: null }),
        insert: async (value: Record<string, unknown>) => {
          inserts[table] = value;
          return { error: null };
        },
      };
      return query;
    },
  };
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/supabase": { getSupabase: () => sb },
    "@/lib/bazaar-auth": {
      authenticateKey: async () => ({ id: "consumer-test", type: "consumer", balance_cents: cents }),
    },
    "@/lib/receipts": {
      generateReceiptId: () => "rcpt_test",
      signReceipt: (value: Record<string, unknown>) => { signed = value; return "test-signature"; },
    },
  };
  const source = readFileSync(resolve(`../../src/app/api/v1/bazaar/${name}/route.ts`), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const handlers: Record<string, (request: Request) => Promise<Response>> = {};
  new Function("require", "exports", outputText)((id: string) => {
    assert.ok(Object.prototype.hasOwnProperty.call(dependencies, id), `unexpected dependency: ${id}`);
    return dependencies[id];
  }, handlers);
  const client = new Bazaar({
    apiKey: "bz_test",
    fetch: async (input, init) => {
      const request = new Request(input, init);
      assert.equal(new URL(request.url).pathname, `/api/v1/bazaar/${name}`);
      return handlers[request.method](request);
    },
  });
  return { client, inserts, signed: () => signed };
}

// Aug 14 regression: multiplying cents by 100 understated microcents by 100x.
for (const [cents, microcents] of [[0, 0], [0.0001, 1], [0.25, 2500], [1, 10000], [100, 1000000]]) {
  test(`SDK/API contract: ${cents} cents = ${microcents} microcents`, async () => {
    const balance = await route("balance", cents).client.balance.get() as unknown as Record<string, unknown>;
    assert.equal(balance.balance_cents, cents);
    assert.equal(balance.balance_microcents, microcents);

    const pricing = await route("pricing", cents).client.catalog.pricing() as unknown as {
      pricing: { pricing: { price_per_call_cents: number; price_per_call_microcents: number } }[];
    };
    assert.equal(pricing.pricing[0].pricing.price_per_call_cents, cents);
    assert.equal(pricing.pricing[0].pricing.price_per_call_microcents, microcents);

    const stats = await route("stats", cents).client.stats.get() as unknown as Record<string, unknown>;
    assert.equal(stats.total_revenue_cents, cents);
    assert.equal(stats.total_revenue_microcents, microcents);

    const meter = route("meter", cents);
    const receipt = await meter.client.meter.record({ tool_name: "test.tool" }) as unknown as Record<string, unknown>;
    assert.equal(receipt.cost_microcents, microcents);
    assert.equal(meter.inserts.bazaar_usage_logs.cost_cents, cents);
    assert.equal(meter.inserts.bazaar_receipts.cost_microcents, microcents);
    assert.equal(meter.signed()?.cost_microcents, microcents);
  });
}

test("failed metering still records and signs zero microcents", async () => {
  const meter = route("meter", 1);
  const receipt = await meter.client.request<{ cost_microcents: number }>(
    "POST", "/api/v1/bazaar/meter", { tool_name: "test.tool", status: "error" },
  );
  assert.equal(receipt.cost_microcents, 0);
  assert.equal(meter.inserts.bazaar_usage_logs.cost_cents, 0);
  assert.equal(meter.inserts.bazaar_receipts.cost_microcents, 0);
  assert.equal(meter.signed()?.cost_microcents, 0);
});
