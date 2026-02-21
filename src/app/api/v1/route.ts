import { NextResponse } from "next/server";

const HEADERS = {
  "X-Noui-Version": "0.2.0",
  "X-Noui-Docs": "https://noui.bot/docs",
  "X-Noui-Discovery": "https://noui.bot/.well-known/agents.json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  return NextResponse.json({
    name: "noui.bot",
    version: "0.2.0",
    description: "Agent-first infrastructure. APIs designed for bots, not browsers.",
    base_url: "https://noui.bot/api/v1",
    endpoints: {
      "GET /api/v1": "This document",
      "GET /api/v1/status": "Platform status + capabilities",
      "GET /api/v1/health": "Health check with uptime",
      "GET /api/v1/stats": "Aggregate counts — no PII",
      "GET /api/v1/services": "Service directory with status",
      "POST /api/v1/waitlist": "Join waitlist (body: { email })",
      "POST /api/v1/feedback": "Report walls and needs (GET for schema)",
      "POST /api/v1/apply": "Apply to build with us (GET for schema)",
      "POST /api/v1/init": "Initialize database schema (idempotent)",
    },
    deploy_rail: {
      description: "Agent-triggered code deployments via shiprail.dev",
      register: "POST https://shiprail.dev/api/agents/register",
      deploy: "POST https://shiprail.dev/api/ship",
      stats: "GET https://shiprail.dev/api/stats",
      docs: "https://noui.bot/docs#deploy-rail",
    },
    links: {
      homepage: "https://noui.bot",
      docs: "https://noui.bot/docs",
      openapi: "https://noui.bot/api/openapi.json",
      struggles: "https://noui.bot/struggles",
      changelog: "https://noui.bot/changelog",
      github: "https://github.com/TombStoneDash/noui-bot",
      agents_json: "https://noui.bot/.well-known/agents.json",
      shiprail: "https://shiprail.dev",
    },
  }, { headers: HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}
