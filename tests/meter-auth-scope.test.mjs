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

const source = await readFile(
  new URL("../src/app/api/v1/bazaar/meter/route.ts", import.meta.url),
  "utf8"
);
const { outputText } = ts.transpileModule(source, {
  fileName: "route.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const CONSUMER = { id: "consumer-1", type: "consumer" };
const PROVIDER = { id: "provider-1", type: "provider" };
const OWN_TOOL = {
  id: "tool-own",
  provider_id: "provider-1",
  price_cents_override: 7,
  bazaar_providers: { default_price_cents: 1 },
};
const OTHER_TOOL = { ...OWN_TOOL, id: "tool-other", provider_id: "provider-2" };

async function post(body, { owner = CONSUMER, tool = OWN_TOOL } = {}) {
  const inserts = [];
  const toolFilters = [];
  const sb = {
    from(table) {
      if (table === "bazaar_tools") {
        const builder = {
          select: () => builder,
          eq(column, value) { toolFilters.push([column, value]); return builder; },
          single: async () => ({ data: tool, error: tool ? null : { message: "not found" } }),
        };
        return builder;
      }
      return {
        insert: async (row) => {
          inserts.push({ table, row });
          return { error: null };
        },
      };
    },
  };
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "next/server") {
        return { NextResponse: { json: (payload, init) => Response.json(payload, init) } };
      }
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") return { authenticateKey: async () => owner };
      if (name === "@/lib/receipts") {
        return { generateReceiptId: () => "rcpt_test", signReceipt: () => "sig" };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
    Response,
    Date,
  });
  vm.runInContext(outputText, context);
  const request = new Request("https://noui.bot/api/v1/bazaar/meter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const response = await context.exports.POST(request);
  return { status: response.status, json: await response.json(), inserts, toolFilters };
}

test("consumer metering its own call records usage and a receipt", async () => {
  const out = await post({ tool_id: "tool-own" });
  assert.equal(out.status, 201);
  assert.equal(out.json.agent_id, CONSUMER.id);
  assert.equal(out.json.cost_cents, 7);
  assert.deepEqual(out.inserts.map((i) => i.table), ["bazaar_usage_logs", "bazaar_receipts"]);
  assert.equal(out.inserts[0].row.consumer_id, CONSUMER.id);
});

test("consumer cannot meter a call in another agent's name", async () => {
  const out = await post({ tool_id: "tool-own", agent_id: "consumer-victim" });
  assert.equal(out.status, 403);
  assert.equal(out.json.code, "FORBIDDEN");
  assert.equal(out.inserts.length, 0, "no usage row and no signed receipt");
});

test("provider can meter its own tool on behalf of a consumer", async () => {
  const out = await post({ tool_id: "tool-own", agent_id: "consumer-9" }, { owner: PROVIDER });
  assert.equal(out.status, 201);
  assert.equal(out.inserts[0].row.consumer_id, "consumer-9");
  assert.equal(out.inserts[0].row.provider_id, PROVIDER.id);
});

test("provider cannot meter another provider's tool", async () => {
  const out = await post({ tool_id: "tool-other", agent_id: "consumer-9" }, { owner: PROVIDER, tool: OTHER_TOOL });
  assert.equal(out.status, 403);
  assert.equal(out.inserts.length, 0);
});

test("provider tool_name lookup is scoped to the provider's own catalog", async () => {
  const out = await post({ tool_name: "search" }, { owner: PROVIDER });
  assert.equal(out.status, 201);
  assert.deepEqual(out.toolFilters, [["active", true], ["tool_name", "search"], ["provider_id", PROVIDER.id]]);
});

test("unknown status is rejected instead of stored", async () => {
  const out = await post({ tool_id: "tool-own", status: "refunded" });
  assert.equal(out.status, 422);
  assert.equal(out.inserts.length, 0);
});

for (const [name, body] of [
  ["string duration", { tool_id: "tool-own", duration_ms: "fast" }],
  ["negative tokens", { tool_id: "tool-own", input_tokens: -1 }],
  ["numeric tool_id", { tool_id: 42 }],
  ["array metadata", { tool_id: "tool-own", metadata: [1] }],
  ["missing tool", {}],
]) {
  test(`422 on ${name}`, async () => {
    const out = await post(body);
    assert.equal(out.status, 422);
    assert.equal(out.inserts.length, 0);
  });
}

for (const [name, body] of [["null", "null"], ["array", "[]"], ["number", "5"], ["broken JSON", "{"]]) {
  test(`400 on ${name} body`, async () => {
    const out = await post(body);
    assert.equal(out.status, 400);
    assert.equal(out.inserts.length, 0);
  });
}
