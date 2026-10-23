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

async function post(body, { owner = CONSUMER, tool = OWN_TOOL, tools, toolError = null, insertError = null, receiptError = null } = {}) {
  const inserts = [];
  const toolFilters = [];
  const rows = tools ?? (tool ? [tool] : []);
  const sb = {
    from(table) {
      if (table === "bazaar_tools") {
        const builder = {
          select: () => builder,
          eq(column, value) { toolFilters.push([column, value]); return builder; },
          limit: async (n) => (toolError ? { data: null, error: toolError } : { data: rows.slice(0, n), error: null }),
        };
        return builder;
      }
      return {
        insert: async (row) => {
          const error = table === "bazaar_usage_logs" ? insertError : receiptError;
          if (!error) inserts.push({ table, row });
          return { error };
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
    console: { error() {} },
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
  ["out-of-range duration", { tool_id: "tool-own", duration_ms: 1e12 }],
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

test("an unknown tool is a 404 with no usage row and no signed receipt", async () => {
  const out = await post({ tool_id: "tool-missing" }, { tool: null });
  assert.equal(out.status, 404);
  assert.equal(out.json.code, "TOOL_NOT_FOUND");
  assert.equal(out.inserts.length, 0);
});

test("a provider metering an unknown tool name is also a 404", async () => {
  const out = await post({ tool_name: "nope" }, { owner: PROVIDER, tool: null });
  assert.equal(out.status, 404);
  assert.equal(out.inserts.length, 0);
});

test("a tool lookup failure is a 500, never a $0 call", async () => {
  const out = await post({ tool_id: "tool-own" }, { toolError: { message: "connection reset by db-host-7" } });
  assert.equal(out.status, 500);
  assert.equal(out.json.code, "METER_FAILED");
  assert.doesNotMatch(JSON.stringify(out.json), /db-host-7/);
  assert.equal(out.inserts.length, 0);
});

test("a consumer tool_name shared by several providers is ambiguous", async () => {
  const out = await post({ tool_name: "search" }, { tools: [OWN_TOOL, OTHER_TOOL] });
  assert.equal(out.status, 409);
  assert.equal(out.json.code, "AMBIGUOUS_TOOL");
  assert.equal(out.inserts.length, 0);
});

test("a usage insert failure does not echo the database error", async () => {
  const out = await post({ tool_id: "tool-own" }, { insertError: { message: 'violates foreign key constraint "fk_secret"' } });
  assert.equal(out.status, 500);
  assert.equal(out.json.code, "METER_FAILED");
  assert.doesNotMatch(JSON.stringify(out.json), /fk_secret/);
});

test("tokens go to the token columns and fractional values are rounded", async () => {
  const out = await post({ tool_id: "tool-own", duration_ms: 12.6, input_tokens: 100, output_tokens: 40.2 });
  assert.equal(out.status, 201);
  const usage = out.inserts[0].row;
  assert.equal(usage.latency_ms, 13);
  assert.equal(usage.tokens_input, 100);
  assert.equal(usage.tokens_output, 40);
  assert.equal(usage.request_size_bytes, undefined, "tokens are not bytes");
  const receipt = out.inserts[1].row;
  assert.equal(receipt.duration_ms, 13);
  assert.equal(receipt.input_hash, undefined, "a token count is not a hash");
});

test("an unstored receipt is reported, not handed out with a dead verify_url", async () => {
  const out = await post({ tool_id: "tool-own" }, { receiptError: { message: "insert failed" } });
  assert.equal(out.status, 201);
  assert.equal(out.json.metered, true);
  assert.equal(out.json.receipt, null);
  assert.equal(out.json.receipt_persisted, false);
});

test("a stored receipt comes back with its verify_url", async () => {
  const out = await post({ tool_id: "tool-own" });
  assert.equal(out.json.receipt_persisted, true);
  assert.equal(out.json.receipt.verify_url, "https://noui.bot/api/v1/bazaar/receipts/rcpt_test");
});
