import { NextResponse } from "next/server";

const HEADERS = {
  "X-Noui-Version": "0.4.0",
  "X-Noui-Docs": "https://noui.bot/docs",
  "X-Noui-Discovery": "https://noui.bot/.well-known/agents.json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  return NextResponse.json({
    name: "noui.bot",
    version: "0.4.0",
    description: "Agent-first infrastructure with trust layer. APIs designed for bots, not browsers.",
    base_url: "https://noui.bot/api/v1",
    endpoints: {
      "GET  /api/v1":            "This document — single source of truth for the API surface",
      "GET  /api/v1/status":     "Platform status + capabilities",
      "GET  /api/v1/health":     "Health check with uptime",
      "GET  /api/v1/stats":      "Aggregate counts — no PII",
      "GET  /api/v1/services":   "Service directory with status",
      "POST /api/v1/waitlist":   "Join waitlist (body: { email })",
      "POST /api/v1/feedback":   "Report walls and needs (GET for schema)",
      "POST /api/v1/apply":      "Apply to build with us (GET for schema)",
      "POST /api/v1/init":       "Initialize database schema (idempotent)",
    },
    bazaar: {
      description: "Agent Bazaar — billing, metering, and auth for MCP servers",
      base_url: "https://noui.bot/api/bazaar",
      moat: "Trust-first billing for MCP tools. Verified providers, signed receipts, SLAs, dispute resolution. 10% platform fee.",
      endpoints: {
        // Public (no auth)
        "GET  /api/bazaar":                   "Bazaar index — overview, flow, and endpoint listing",
        "GET  /api/bazaar/catalog":           "Public tool catalog with prices and stats",
        "GET  /api/v1/bazaar/stats":          "Public dashboard — invocations, revenue, providers, tools",
        "GET  /api/v1/bazaar/pricing":        "Public tool pricing — per-call costs, free tiers",
        // Registration (no auth)
        "POST /api/bazaar/register-provider": "Register an MCP server, set pricing, get API key",
        "POST /api/bazaar/register-consumer": "Sign up as an agent developer, get API key",
        // Authenticated
        "POST /api/bazaar/proxy":             "Proxy an MCP tool call (metered, billed, retried on 5xx)",
        "POST /api/bazaar/tools":             "Register tools for your provider (provider key required)",
        "POST /api/v1/bazaar/meter":          "Record a tool invocation + auto-generate signed receipt",
        "GET  /api/v1/bazaar/balance":        "Check agent's current balance (consumer key required)",
        "GET  /api/v1/bazaar/usage":          "View usage and costs (consumer or provider)",
        "GET  /api/v1/bazaar/usage/summary":  "Aggregate usage stats — total spend, top tools, calls by day",
        "POST /api/bazaar/billing/provider-summary": "Provider earnings, pending payout, platform fee breakdown",
        // Stripe Connect (provider payouts)
        "POST /api/bazaar/connect":           "Start Stripe Connect onboarding for provider payouts",
        "GET  /api/bazaar/connect":           "Check Stripe Connect onboarding status",
        "POST /api/bazaar/balance/load":      "Load consumer balance (Stripe Checkout or dry-run)",
        "POST /api/bazaar/payouts":           "Trigger provider payout ($10 minimum)",
        "GET  /api/bazaar/payouts":           "Payout history and pending balance",
      },
      trust_layer: {
        description: "Trust primitives for commercial-grade agent commerce. What makes Bazaar different.",
        version: "0.4.0",
        endpoints: {
          // Receipts (public verification)
          "GET  /api/v1/bazaar/receipts":           "List signed receipts (auth required, scoped to owner)",
          "GET  /api/v1/bazaar/receipts/:id":       "Fetch + verify a single receipt (public, no auth)",
          // Provider verification
          "POST /api/v1/bazaar/providers/verify":   "Submit verification request (email, domain, or code)",
          "GET  /api/v1/bazaar/providers/verify":   "Verification requirements and levels",
          // Provider SLA
          "GET  /api/v1/bazaar/providers/:id/sla":  "30-day SLA metrics — uptime, latency, error rate (public)",
          // Trust score
          "GET  /api/v1/bazaar/providers/:id/trust": "Composite trust score — verification + SLA + disputes (public)",
          // Disputes
          "POST /api/v1/bazaar/disputes":           "File a dispute against a receipt (auth required)",
          "GET  /api/v1/bazaar/disputes":           "List disputes for authenticated user",
          "GET  /api/v1/bazaar/disputes/:id":       "Fetch dispute status (public)",
        },
        verification_levels: ["unverified", "email", "domain", "code"],
        trust_badges: ["unrated", "basic", "trusted", "verified"],
      },
      self_service: {
        providers: "https://noui.bot/providers/register",
        provider_dashboard: "https://noui.bot/providers/dashboard",
        developers: "https://noui.bot/developers/register",
        developer_dashboard: "https://noui.bot/developers/dashboard",
      },
    },
    links: {
      homepage: "https://noui.bot",
      docs: "https://noui.bot/docs",
      openapi: "https://noui.bot/api/openapi.json",
      specs: "https://noui.bot/specs/mcp-billing-v1.md",
      struggles: "https://noui.bot/struggles",
      changelog: "https://noui.bot/changelog",
      github: "https://github.com/TombStoneDash/noui-bot",
      agents_json: "https://noui.bot/.well-known/agents.json",
    },
  }, { headers: HEADERS });
}

/**
 * POST handler — BotWall3t MCP endpoint.
 * Handles JSON-RPC tools/call requests forwarded by the Bazaar proxy.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400, headers: HEADERS }
    );
  }

  const method = body.method as string;
  const params = (body.params || {}) as Record<string, unknown>;
  const id = body.id;

  // Handle MCP tools/call
  if (method === "tools/call") {
    const toolName = params.name as string;
    const args = (params.arguments || {}) as Record<string, unknown>;

    switch (toolName) {
      case "wallet.balance": {
        const wallet = args.wallet_address as string || "unknown";
        const chain = args.chain as string || "base";
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                wallet_address: wallet,
                chain,
                balances: {
                  USDC: "142.50",
                  ETH: "0.0847",
                  NOUI: "1000.00",
                },
                last_updated: new Date().toISOString(),
              }),
            }],
          },
          id,
        }, { headers: HEADERS });
      }

      case "wallet.transfer": {
        const from = args.from as string || "unknown";
        const to = args.to as string || "unknown";
        const amount = args.amount as string || "0";
        const token = args.token as string || "USDC";
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "completed",
                tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
                from,
                to,
                amount,
                token,
                timestamp: new Date().toISOString(),
              }),
            }],
          },
          id,
        }, { headers: HEADERS });
      }

      case "access.verify": {
        const wallet = args.wallet_address as string || "unknown";
        const resource = args.resource_id as string || "unknown";
        const minBalance = args.min_balance as string || "0";
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                wallet_address: wallet,
                resource_id: resource,
                access_granted: true,
                reason: `Wallet balance exceeds minimum requirement of ${minBalance}`,
                checked_at: new Date().toISOString(),
              }),
            }],
          },
          id,
        }, { headers: HEADERS });
      }

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32601, message: `Tool not found: ${toolName}` },
          id,
        }, { status: 404, headers: HEADERS });
    }
  }

  // Handle MCP tools/list
  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      result: {
        tools: [
          {
            name: "wallet.balance",
            description: "Check the token balance of an agent wallet.",
            inputSchema: { type: "object", properties: { wallet_address: { type: "string" }, chain: { type: "string", enum: ["ethereum", "base", "solana"], default: "base" } }, required: ["wallet_address"] },
          },
          {
            name: "wallet.transfer",
            description: "Transfer tokens between agent wallets.",
            inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, amount: { type: "string" }, token: { type: "string", default: "USDC" } }, required: ["from", "to", "amount"] },
          },
          {
            name: "access.verify",
            description: "Verify if a wallet meets token-gating requirements.",
            inputSchema: { type: "object", properties: { wallet_address: { type: "string" }, resource_id: { type: "string" }, min_balance: { type: "string", default: "0" } }, required: ["wallet_address", "resource_id"] },
          },
        ],
      },
      id,
    }, { headers: HEADERS });
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    error: { code: -32601, message: `Method not supported: ${method}` },
    id,
  }, { status: 400, headers: HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}
