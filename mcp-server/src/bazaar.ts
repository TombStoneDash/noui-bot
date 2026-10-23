import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const NOUI_ORIGIN = "https://noui.bot";
export const BAZAAR_TIMEOUT_MS = 30_000;
const MAX_ERROR_BODY_CHARS = 500;

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
export type BazaarToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

export type BazaarOptions = {
  /** Consumer key (bz_...). Read from NOUI_API_KEY by default. */
  apiKey?: string;
  origin?: string;
  fetchImpl?: Fetch;
  timeoutMs?: number;
};

const MISSING_KEY =
  "NOUI_API_KEY is not set. Add \"env\": { \"NOUI_API_KEY\": \"bz_...\" } to this server's MCP config. " +
  "Get a key at https://noui.bot/developers/register";

function text(value: string, isError = false): BazaarToolResult {
  return isError ? { content: [{ type: "text", text: value }], isError: true } : { content: [{ type: "text", text: value }] };
}

/**
 * Handlers behind the bazaar_* MCP tools. Every outcome — network failure, timeout,
 * non-2xx (402 balance, 429 rate limit, 502/504 provider errors) or a non-JSON body —
 * becomes a readable tool result instead of an exception.
 */
export function createBazaarHandlers(options: BazaarOptions = {}) {
  const origin = options.origin ?? NOUI_ORIGIN;
  const fetchImpl = options.fetchImpl ?? (fetch as Fetch);
  const timeoutMs = options.timeoutMs ?? BAZAAR_TIMEOUT_MS;
  const apiKey = options.apiKey?.trim() || undefined;

  async function request(path: string, init: RequestInit = {}): Promise<BazaarToolResult> {
    const label = `${init.method ?? "GET"} ${path}`;
    let res: Response;
    let body: string;
    try {
      res = await fetchImpl(`${origin}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      body = await res.text();
    } catch (error) {
      const reason = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? `timed out after ${timeoutMs / 1000}s`
        : error instanceof Error ? error.message : String(error);
      return text(`${label} failed: ${reason}`, true);
    }
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      const snippet = body.trim().slice(0, MAX_ERROR_BODY_CHARS);
      return text(`${label} returned HTTP ${res.status} with a non-JSON body${snippet ? `: ${snippet}` : ""}`, true);
    }
    const pretty = JSON.stringify(data, null, 2);
    return res.ok ? text(pretty) : text(`${label} returned HTTP ${res.status}:\n${pretty}`, true);
  }

  const authHeaders = (): Record<string, string> => ({ Authorization: `Bearer ${apiKey}` });

  return {
    /** Public catalog: GET /api/bazaar/catalog. No key needed. */
    listTools(args: { category?: string; limit?: number; offset?: number }) {
      const params = new URLSearchParams();
      if (args.category) params.set("category", args.category);
      if (args.limit !== undefined) params.set("limit", String(args.limit));
      if (args.offset !== undefined) params.set("offset", String(args.offset));
      const query = params.size ? `?${params}` : "";
      return request(`/api/bazaar/catalog${query}`);
    },

    /** Metered call: POST /api/bazaar/proxy, billed to the key's balance. */
    async callTool(args: { tool_id?: string; tool_name?: string; arguments?: Record<string, unknown>; idempotency_key?: string }) {
      if (!apiKey) return text(MISSING_KEY, true);
      if (!args.tool_id && !args.tool_name) return text("Pass tool_id (preferred) or tool_name from bazaar_list_tools.", true);
      const headers: Record<string, string> = { ...authHeaders(), "Content-Type": "application/json" };
      if (args.idempotency_key) headers["Idempotency-Key"] = args.idempotency_key;
      const target = args.tool_id ? { tool_id: args.tool_id } : { tool_name: args.tool_name };
      return request("/api/bazaar/proxy", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...target, input: args.arguments ?? {} }),
      });
    },

    /** GET /api/v1/bazaar/balance for the configured key. */
    async balance() {
      if (!apiKey) return text(MISSING_KEY, true);
      return request("/api/v1/bazaar/balance", { headers: authHeaders() });
    },
  };
}

export function registerBazaarTools(server: McpServer, options: BazaarOptions = { apiKey: process.env.NOUI_API_KEY }) {
  const handlers = createBazaarHandlers(options);

  server.tool(
    "bazaar_list_tools",
    "List paid and free tools in the Agent Bazaar catalog with their price per call. Use the returned id with bazaar_call_tool.",
    {
      category: z.enum(["weather", "search", "code", "data", "comms", "other"]).optional(),
      limit: z.number().int().min(1).max(100).optional().describe("Page size (default 50, max 100)"),
      offset: z.number().int().min(0).optional().describe("Number of tools to skip"),
    },
    async (args) => handlers.listTools(args),
  );

  server.tool(
    "bazaar_call_tool",
    "Run an Agent Bazaar tool through the metered proxy. Each successful call is billed to the NOUI_API_KEY balance and returns a signed receipt; failed calls are not billed.",
    {
      tool_id: z.string().optional().describe("Tool id from bazaar_list_tools (preferred)"),
      tool_name: z.string().optional().describe("Tool name, if you do not have the id"),
      arguments: z.record(z.string(), z.unknown()).optional().describe("Arguments object passed to the tool"),
      idempotency_key: z.string().min(1).max(128).optional().describe("Reuse to retry safely without being charged twice"),
    },
    async (args) => handlers.callTool(args),
  );

  server.tool(
    "bazaar_balance",
    "Show the prepaid Agent Bazaar balance for NOUI_API_KEY.",
    {},
    async () => handlers.balance(),
  );
}
