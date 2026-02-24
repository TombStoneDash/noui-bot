import { NextResponse } from "next/server";

const HEADERS = {
  "X-Noui-Version": "0.3.0",
  "X-Noui-Docs": "https://noui.bot/docs",
  "X-Noui-Discovery": "https://noui.bot/.well-known/agents.json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  return NextResponse.json({
    name: "noui.bot",
    version: "0.3.0",
    description: "Agent-first infrastructure. APIs designed for bots, not browsers.",
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
      endpoints: {
        "GET  /api/bazaar":                   "Bazaar index — overview, flow, and endpoint listing",
        "GET  /api/bazaar/catalog":           "Public tool catalog with prices and stats",
        "POST /api/bazaar/register-provider": "Register an MCP server, set pricing, get API key",
        "POST /api/bazaar/register-consumer": "Sign up as an agent developer, get API key",
        "POST /api/bazaar/proxy":             "Proxy an MCP tool call (authenticated, metered, billed)",
        "GET  /api/bazaar/usage":             "View usage and costs (consumer or provider)",
        "GET  /api/bazaar/usage/summary":     "Aggregate usage stats — total spend, top tools, calls by day",
        "POST /api/bazaar/billing/provider-summary": "Provider earnings, pending payout, platform fee breakdown",
        "POST /api/bazaar/connect":           "Start Stripe Connect onboarding for provider payouts",
        "GET  /api/bazaar/connect":           "Check Stripe Connect onboarding status",
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}
