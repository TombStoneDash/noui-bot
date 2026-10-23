// End-to-end check for the LangChain, CrewAI and AutoGen guides (issue #107):
// the Python each page displays is run against the real /api/bazaar/proxy route
// handler served over local HTTP. Only Supabase, the provider upstream and the
// agent frameworks themselves (which would need an LLM) are faked.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire, registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

process.env.RECEIPT_SIGNING_SECRET = "";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const billingUrl = new URL("../src/lib/proxy-billing.ts", import.meta.url).href;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === billingUrl && specifier === "./receipts") return nextResolve("./receipts.ts", context);
    return nextResolve(specifier, context);
  },
});
const billing = await import("../src/lib/proxy-billing.ts");
const receipts = await import("../src/lib/receipts.ts");
hooks.deregister();

function transpile(source, fileName, jsx = false) {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
    },
  }).outputText;
}

const API_KEY = "bz_guide_test_key";
const CONSUMER = "11111111-1111-4111-8111-111111111111";
const PROVIDER = { id: "22222222-2222-4222-8222-222222222222", name: "Fixture Co", endpoint_url: "https://provider.test/mcp", pricing_model: "per_call", default_price_cents: 0, active: true };
const WEATHER = { id: "33333333-3333-4333-8333-333333333333", tool_name: "weather.forecast", display_name: "Weather", description: "Forecast for a city; arguments: {city}", price_cents_override: 5 };
const PREMIUM = { id: "44444444-4444-4444-8444-444444444444", tool_name: "premium.report", display_name: "Premium report", description: null, price_cents_override: 500 };
const TOOLS = [WEATHER, PREMIUM].map((t) => ({ ...t, active: true, pricing_model_override: null, call_count: 0, avg_latency_ms: null, bazaar_providers: PROVIDER }));

// ---- real proxy route over a fake Supabase ----
function fakeSupabase() {
  const state = { balance: 100, toolLookups: [], usageLogs: [] };
  const answer = ({ table, op, payload, filters }) => {
    if (table === "bazaar_usage_logs" && op === "select") return { count: 0, data: [], error: null };
    if (table === "bazaar_usage_logs" && op === "insert") { state.usageLogs.push(payload); return { error: null }; }
    if (table === "bazaar_tools" && op === "select") {
      const id = filters.find(([c]) => c === "id")?.[1];
      state.toolLookups.push(filters);
      const tool = TOOLS.find((t) => t.id === id);
      return tool ? { data: tool, error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    }
    if (table === "bazaar_tools" && op === "update") return { error: null };
    if (table === "bazaar_receipts" && op === "insert") return { error: null };
    throw new Error(`unexpected ${table}.${op}`);
  };
  const builder = (table, op, payload) => {
    const rec = { table, op, payload, filters: [] };
    const resolve = () => Promise.resolve(answer(rec));
    const b = {
      eq(c, v) { rec.filters.push([c, v]); return b; },
      gte() { return b; }, order() { return b; }, limit() { return b; },
      single: resolve, maybeSingle: resolve,
      then(f, r) { return resolve().then(f, r); },
    };
    return b;
  };
  return {
    state,
    from: (table) => ({
      select: (cols, opts) => builder(table, "select", { cols, opts }),
      insert: (row) => builder(table, "insert", row),
      update: (row) => builder(table, "update", row),
    }),
    async rpc(fn, args) {
      assert.equal(fn, "bazaar_debit_balance");
      if (state.balance < args.p_cents) return { data: null, error: null };
      state.balance -= args.p_cents;
      return { data: state.balance, error: null };
    },
  };
}

const routeJs = transpile(await readFile(new URL("../src/app/api/bazaar/proxy/route.ts", import.meta.url), "utf8"), "route.ts");

function loadProxyRoute(sb) {
  const upstreamCalls = [];
  const context = vm.createContext({
    exports: {},
    console, Date, Promise, TextEncoder, AbortSignal, Response, crypto, setTimeout,
    process: { env: { ...process.env } },
    async fetch(url, init) {
      const rpc = JSON.parse(init.body);
      upstreamCalls.push({ url, rpc });
      const body = { jsonrpc: "2.0", id: rpc.id, result: { content: [{ type: "text", text: JSON.stringify(rpc.params.arguments) }] } };
      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/supabase") return { getSupabase: () => sb };
      if (name === "@/lib/bazaar-auth") return {
        authenticateKey: async (request) => request.headers.get("authorization") === `Bearer ${API_KEY}`
          ? { id: CONSUMER, type: "consumer", balance_cents: sb.state.balance, rate_limit_rpm: 60 }
          : null,
      };
      if (name === "@/lib/proxy-billing") return billing;
      if (name === "@/lib/receipts") return receipts;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(routeJs, context);
  return { POST: context.exports.POST, upstreamCalls };
}

// Catalog in the shape GET /api/bazaar/catalog returns, one tool per page to exercise pagination.
function catalogPage(url) {
  const offset = Number(url.searchParams.get("offset"));
  const tools = TOOLS.slice(offset, offset + 1).map((t) => ({
    id: t.id, tool_name: t.tool_name, display_name: t.display_name, description: t.description, category: "other",
    provider: { id: PROVIDER.id, name: PROVIDER.name, verified: true },
    pricing: { model: "per_call", price_cents: t.price_cents_override, price: `$${(t.price_cents_override / 100).toFixed(4)}/call`, free_tier_calls: 0 },
    stats: { total_calls: 0, avg_latency_ms: null, uptime_pct: null },
  }));
  return { tools, total: TOOLS.length, limit: Number(url.searchParams.get("limit")), offset };
}

async function startBazaar() {
  const sb = fakeSupabase();
  const { POST, upstreamCalls } = loadProxyRoute(sb);
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const url = new URL(req.url, "http://127.0.0.1");
    requests.push({ method: req.method, path: url.pathname, search: url.search, authorization: req.headers.authorization, body });
    let response;
    if (req.method === "GET" && url.pathname === "/api/bazaar/catalog") {
      response = Response.json(catalogPage(url));
    } else if (req.method === "POST" && url.pathname === "/api/bazaar/proxy") {
      response = await POST(new Request(`https://noui.bot${url.pathname}`, { method: "POST", headers: req.headers, body }));
    } else {
      response = Response.json({ error: true }, { status: 404 });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { sb, upstreamCalls, requests, url: `http://127.0.0.1:${server.address().port}/api/bazaar`, close: () => new Promise((r) => server.close(r)) };
}

// ---- the guides as rendered ----
const clientModule = { exports: {} };
vm.runInNewContext(
  transpile(await readFile(new URL("../src/app/docs/guides/bazaar-python-client.ts", import.meta.url), "utf8"), "client.ts"),
  { exports: clientModule.exports },
);
const { BAZAAR_PYTHON_CLIENT } = clientModule.exports;

function renderedSnippets(guide) {
  const source = require("node:fs").readFileSync(new URL(`../src/app/docs/guides/${guide}/page.tsx`, import.meta.url), "utf8");
  const page = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(transpile(source, "page.tsx", true), {
    exports: page,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "../bazaar-python-client") return clientModule.exports;
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const text = (node) => Array.isArray(node) ? node.map(text).join("")
    : node && typeof node === "object" ? text(node.props.children)
      : typeof node === "string" || typeof node === "number" ? String(node) : "";
  const pres = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (node.type === "pre") pres.push(text(node.props.children));
    walk(node.props.children);
  };
  walk(page.default());
  return pres;
}

// Stand-ins for the framework classes the guides use. Each "agent run" calls every
// tool it was given once, the way a model would, with arguments {"city": "Paris"}.
const PY_FAKES = String.raw`
import asyncio, inspect, json, runpy, sys, types

record = {"tools": [], "outputs": []}
ARGS = {"city": "Paris"}

def module(name, **attrs):
    m = types.ModuleType(name)
    m.__dict__.update(attrs)
    sys.modules[name] = m

def use(name, description, out):
    assert isinstance(out, str), out
    record["tools"].append([name, description])
    record["outputs"].append(out)
    return out

def single_arguments_param(func):
    params = inspect.signature(func).parameters
    assert list(params) == ["arguments"] and params["arguments"].annotation is dict, params

# LangChain
class StructuredTool:
    @classmethod
    def from_function(cls, func, name, description):
        single_arguments_param(func)
        tool = cls()
        tool.func, tool.name, tool.description = func, name, description
        return tool
    def invoke(self, tool_input):
        return self.func(**tool_input)

def create_agent(model, tools, system_prompt):
    class Agent:
        def invoke(self, state):
            outs = [use(t.name, t.description, t.invoke({"arguments": ARGS})) for t in tools]
            return {"messages": [types.SimpleNamespace(content="\n".join(outs))]}
    return Agent()

module("langchain"); module("langchain.agents", create_agent=create_agent)
module("langchain_core"); module("langchain_core.tools", StructuredTool=StructuredTool)
module("langchain_openai", ChatOpenAI=lambda **kw: object())

# CrewAI (BaseTool is a pydantic model: only declared fields are accepted)
class BaseTool:
    def __init__(self, **kwargs):
        allowed = {"name", "description", *getattr(type(self), "__annotations__", {})}
        assert set(kwargs) == allowed, (set(kwargs), allowed)
        self.__dict__.update(kwargs)
    def run(self, **kwargs):
        return self._run(**kwargs)

class Agent:
    def __init__(self, role, goal, backstory, tools=(), verbose=False):
        self.tools = list(tools)

class Crew:
    def __init__(self, agents, tasks, verbose=False):
        self.agents = agents
    def kickoff(self):
        return "\n".join(use(t.name, t.description, t.run(arguments=ARGS)) for a in self.agents for t in a.tools)

module("crewai", Agent=Agent, Crew=Crew, Task=lambda **kw: kw)
module("crewai.tools", BaseTool=BaseTool)

# AutoGen
class FunctionTool:
    def __init__(self, func, description, name):
        single_arguments_param(func)
        self.func, self.description, self.name = func, description, name

class AssistantAgent:
    def __init__(self, name, model_client, tools=(), system_message="", reflect_on_tool_use=False):
        self.tools = list(tools)
    async def run(self, task):
        outs = [use(t.name, t.description, await asyncio.to_thread(t.func, arguments=ARGS)) for t in self.tools]
        return types.SimpleNamespace(messages=[types.SimpleNamespace(content="\n".join(outs))])

class OpenAIChatCompletionClient:
    def __init__(self, model):
        pass
    async def close(self):
        record["closed"] = True

module("autogen_agentchat"); module("autogen_agentchat.agents", AssistantAgent=AssistantAgent)
module("autogen_core"); module("autogen_core.tools", FunctionTool=FunctionTool)
module("autogen_ext"); module("autogen_ext.models")
module("autogen_ext.models.openai", OpenAIChatCompletionClient=OpenAIChatCompletionClient)

sys.path.insert(0, sys.argv[1])
runpy.run_path(sys.argv[2], run_name="__main__")
print("__RECORD__" + json.dumps(record))
`;

function runPython(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-I", ...args], { env: { PATH: process.env.PATH, ...env } });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

for (const guide of ["langchain-setup", "crewai-setup", "autogen-setup"]) {
  test(`${guide}: displayed Python runs end to end through the real proxy route`, async () => {
    const snippets = renderedSnippets(guide);
    assert.ok(snippets.includes(BAZAAR_PYTHON_CLIENT), "page shows the shared client verbatim");
    assert.ok(snippets.every((s) => !s.includes("/api/mcp/sse")), "no reference to the nonexistent SSE endpoint");
    const agentSnippets = snippets.filter((s) => s.includes("from bazaar_client import"));
    assert.equal(agentSnippets.length, 1);

    const bazaar = await startBazaar();
    const dir = await mkdtemp(join(tmpdir(), `noui-${guide}-`));
    try {
      assert.ok(BAZAAR_PYTHON_CLIENT.includes('BAZAAR_URL = "https://noui.bot/api/bazaar"'));
      await writeFile(join(dir, "bazaar_client.py"), BAZAAR_PYTHON_CLIENT.replace("https://noui.bot/api/bazaar", bazaar.url));
      await writeFile(join(dir, "agent.py"), agentSnippets[0]);
      await writeFile(join(dir, "harness.py"), PY_FAKES);
      const run = await runPython([join(dir, "harness.py"), dir, join(dir, "agent.py")], { NOUI_API_KEY: API_KEY });
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stdout, /^Loaded 2 Bazaar tools$/m);
      const record = JSON.parse(run.stdout.split("__RECORD__")[1]);

      // Tools reach the framework with LLM-safe names, descriptions and prices.
      assert.deepEqual(record.tools, [
        ["weather_forecast", "Forecast for a city; arguments: {city} (price: $0.0500/call). Pass the tool's parameters as a JSON object in 'arguments'."],
        ["premium_report", "Premium report (price: $5.0000/call). Pass the tool's parameters as a JSON object in 'arguments'."],
      ]);
      // The funded call returns the provider's MCP result; the unaffordable one comes back as readable text.
      assert.equal(JSON.parse(record.outputs[0]).content[0].text, '{"city":"Paris"}');
      assert.match(record.outputs[1], /^Bazaar error 402 INSUFFICIENT_FUNDS: Insufficient balance/);

      // Wire contract: catalog paginated, proxy called with the key, tool_id and input object.
      const catalog = bazaar.requests.filter((r) => r.path === "/api/bazaar/catalog");
      assert.deepEqual(catalog.map((r) => r.search), ["?limit=100&offset=0", "?limit=100&offset=1"]);
      const proxied = bazaar.requests.filter((r) => r.path === "/api/bazaar/proxy");
      assert.equal(proxied.length, 2);
      for (const r of proxied) assert.equal(r.authorization, `Bearer ${API_KEY}`);
      assert.deepEqual(proxied.map((r) => JSON.parse(r.body)), [
        { tool_id: WEATHER.id, input: { city: "Paris" } },
        { tool_id: PREMIUM.id, input: { city: "Paris" } },
      ]);
      assert.deepEqual(bazaar.upstreamCalls.map((c) => [c.rpc.method, c.rpc.params]), [
        ["tools/call", { name: "weather.forecast", arguments: { city: "Paris" } }],
      ]);
      assert.equal(bazaar.sb.state.balance, 95, "only the successful call is billed");
      if (guide === "autogen-setup") assert.equal(record.closed, true, "model client closed");
    } finally {
      await bazaar.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test(`${guide}: every displayed Python snippet compiles`, async () => {
    const python = renderedSnippets(guide).filter((s) => !/^(pip |export |# Check|curl )/.test(s));
    assert.ok(python.length >= 2);
    const check = await runPython(["-c", "import json, sys\nfor src in json.loads(sys.argv[1]):\n    compile(src, 'snippet', 'exec')", JSON.stringify(python)], {});
    assert.equal(check.status, 0, check.stderr);
  });
}

test("docs index and agents.json point framework users at the proxy guides, not the old MCP adapters", async () => {
  const docsIndex = await readFile(new URL("../src/app/docs/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(docsIndex, /MCPServerAdapter|McpWorkbench/);
  const { integration } = JSON.parse(await readFile(new URL("../public/.well-known/agents.json", import.meta.url), "utf8"));
  for (const guide of ["langchain", "crewai", "autogen"]) {
    assert.equal(integration[guide].guide, `https://noui.bot/docs/guides/${guide}-setup`);
    await readFile(new URL(`../src/app/docs/guides/${guide}-setup/page.tsx`, import.meta.url));
  }
  assert.equal(integration.bazaar.proxy.split(" ").slice(0, 2).join(" "), "POST https://noui.bot/api/bazaar/proxy");
  assert.equal(integration.mcp.status, "available");
});
