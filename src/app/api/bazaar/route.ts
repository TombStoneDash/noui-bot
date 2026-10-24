import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Agent Bazaar",
    version: "0.3.0",
    tagline: "The monetization layer for AI agent tools",
    description: "Billing, metering, and auth for MCP servers — so builders can charge for their tools and agents can pay to use them.",
    base_url: "/api/bazaar",
    endpoints: {
      "GET  /api/bazaar":                          "This document",
      "GET  /api/bazaar/health":                   "Health check — status, provider/tool counts, uptime",
      "GET  /api/bazaar/catalog":                  "Public tool catalog with prices and stats",
      "GET  /api/bazaar/register-provider":        "Schema for provider registration",
      "POST /api/bazaar/register-provider":        "Register an MCP server, set pricing, get API key",
      "GET  /api/bazaar/register-consumer":        "Schema for consumer registration",
      "POST /api/bazaar/register-consumer":        "Sign up as an agent developer, get API key",
      "GET  /api/bazaar/tools":                    "Schema for tool registration",
      "POST /api/bazaar/tools":                    "Register or update your provider's tools (provider key)",
      "POST /api/bazaar/proxy":                    "Proxy an MCP tool call (authenticated, metered, billed)",
      "POST /api/bazaar/balance/load":             "Add prepaid balance via Stripe Checkout (consumer key)",
      "POST /api/bazaar/checkout":                 "Start a Stripe Checkout session for a Pro or Scale plan (consumer key)",
      "GET  /api/bazaar/subscription":             "Current plan, limits and usage this period (consumer key)",
      "GET  /api/bazaar/usage":                    "View usage and costs (consumer or provider)",
      "GET  /api/bazaar/usage/summary":            "Aggregate usage stats — total spend, top tools, calls by day",
      "POST /api/bazaar/billing/provider-summary": "Provider earnings, pending payout, platform fee breakdown",
      "POST /api/bazaar/billing/stripe-summary":   "Stripe-enriched billing metrics for an agent operator",
      "POST /api/bazaar/billing/rotate-key":       "Revoke the current API key and issue a new one",
      "POST /api/bazaar/connect":                  "Start Stripe Connect onboarding for provider payouts",
      "GET  /api/bazaar/connect":                  "Check Stripe Connect onboarding status",
      "POST /api/bazaar/payouts":                  "Request a payout of provider earnings (minimum $10)",
      "GET  /api/bazaar/payouts":                  "Pending payout balance and payout history (provider key)",
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
