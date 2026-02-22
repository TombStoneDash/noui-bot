import { NextResponse } from "next/server";

const HEADERS = {
  "X-Noui-Version": "0.2.0",
  "X-Noui-Docs": "https://noui.bot/docs",
  "X-Noui-Discovery": "https://noui.bot/.well-known/agents.json",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

export async function GET() {
  const services = [
    {
      id: "deploy-rail",
      name: "Deploy Rail",
      description: "Agent-triggered code deployments. Git URL in, live site out.",
      status: "beta",
      endpoint: "https://shiprail.dev/api/ship",
      registration: "https://shiprail.dev/api/agents/register",
      stats: "https://shiprail.dev/api/stats",
      docs: "https://noui.bot/docs",
      auth: "bearer",
    },
    {
      id: "feedback",
      name: "Agent Feedback",
      description: "Report walls and needs. GET for schema, POST to submit.",
      status: "active",
      endpoint: "https://noui.bot/api/v1/feedback",
      auth: "none",
    },
    {
      id: "apply",
      name: "Builder Applications",
      description: "Apply to build with noui.bot. GET for schema, POST to apply.",
      status: "active",
      endpoint: "https://noui.bot/api/v1/apply",
      auth: "none",
    },
    {
      id: "waitlist",
      name: "Waitlist",
      description: "Join the noui.bot early access waitlist.",
      status: "active",
      endpoint: "https://noui.bot/api/v1/waitlist",
      auth: "none",
    },
    {
      id: "stats",
      name: "Platform Stats",
      description: "Aggregate platform metrics. No PII.",
      status: "active",
      endpoint: "https://noui.bot/api/v1/stats",
      auth: "none",
    },
    {
      id: "form-submit",
      name: "Universal Form Submission",
      description: "POST structured data, we handle the form. CAPTCHAs, fields, confirmation.",
      status: "planned",
      eta: "March 2026",
    },
    {
      id: "human-fallback",
      name: "Human Fallback as a Service",
      description: "When your agent hits a wall, route to a human operator.",
      status: "planned",
    },
    {
      id: "agent-wallet",
      name: "BotWall3t — Agent Wallet",
      description: "Give your bot its own money. Fund wallets, set policies, spend with audit trails.",
      status: "beta",
      endpoint: "https://botwallet-three.vercel.app/api/v1",
      registration: "https://botwallet-three.vercel.app/api/v1/register",
      docs: "https://botwallet-three.vercel.app/api/v1",
      auth: "bearer",
    },
  ];

  const active = services.filter(s => s.status === "active" || s.status === "beta");
  const planned = services.filter(s => s.status === "planned");

  return NextResponse.json({
    services,
    total_active: active.length,
    total_planned: planned.length,
    discovery: "https://noui.bot/.well-known/agents.json",
    docs: "https://noui.bot/docs",
  }, { headers: HEADERS });
}
