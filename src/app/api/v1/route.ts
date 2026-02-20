import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "noui.bot",
    version: "0.1.0",
    description: "Agent-first infrastructure. APIs designed for bots, not browsers.",
    base_url: "https://noui.bot/api/v1",
    endpoints: {
      "GET /api/v1": "This document",
      "GET /api/v1/status": "Platform status",
      "GET /api/v1/health": "Health check",
      "POST /api/v1/waitlist": "Join waitlist (body: { email })",
      "POST /api/v1/feedback": "Submit agent feedback — walls, needs, requests (GET for schema)",
      "POST /api/v1/apply": "Apply to build with us — equity/partnership open (GET for schema)",
      "GET /docs": "API documentation",
    },
    links: {
      homepage: "https://noui.bot",
      docs: "https://noui.bot/docs",
      github: "https://github.com/TombStoneDash/noui-bot",
      agents_json: "https://noui.bot/.well-known/agents.json",
    },
  });
}
