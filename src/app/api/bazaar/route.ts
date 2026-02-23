import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Agent Bazaar",
    version: "0.1.0",
    tagline: "The monetization layer for AI agent tools",
    description: "Billing, metering, and auth for MCP servers — so builders can charge for their tools and agents can pay to use them.",
    base_url: "/api/bazaar",
    endpoints: {
      "GET  /api/bazaar":                    "This document",
      "GET  /api/bazaar/catalog":            "Public tool catalog with prices and stats",
      "POST /api/bazaar/register-provider":  "Register an MCP server, set pricing, get API key",
      "POST /api/bazaar/register-consumer":  "Sign up as an agent developer, get API key",
      "POST /api/bazaar/proxy":              "Proxy an MCP tool call (authenticated, metered, billed)",
      "GET  /api/bazaar/usage":              "View usage and costs (consumer or provider)",
    },
    flow: [
      "1. Provider registers MCP server → gets provider key",
      "2. Consumer registers → gets consumer key + funds balance",
      "3. Consumer calls POST /api/bazaar/proxy with tool request",
      "4. Bazaar: authenticates → checks balance → forwards to MCP → meters → bills → returns response",
      "5. Monthly invoices generated, providers paid out via Stripe Connect",
    ],
    auth: "Bearer bz_... (API key from register endpoints)",
    part_of: {
      platform: "noui.bot",
      related: ["BotWall3t (agent wallets)", "Human Fallback Network (agent→human escalation)"],
    },
  });
}
