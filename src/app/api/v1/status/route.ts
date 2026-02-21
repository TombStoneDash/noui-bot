import { NextResponse } from "next/server";

const LAUNCH_DATE = "2026-02-19T00:00:00Z";
const startTime = Date.now();

const HEADERS = {
  "X-Noui-Version": "0.2.0",
  "X-Noui-Docs": "https://noui.bot/docs",
  "X-Noui-Discovery": "https://noui.bot/.well-known/agents.json",
  "Access-Control-Allow-Origin": "*",
};

export async function GET() {
  const now = new Date();
  const daysSinceLaunch = Math.floor(
    (now.getTime() - new Date(LAUNCH_DATE).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Fetch Deploy Rail stats
  let deployRailStats = null;
  try {
    const res = await fetch("https://shiprail.dev/api/stats", { next: { revalidate: 60 } });
    if (res.ok) deployRailStats = await res.json();
  } catch { /* non-critical */ }

  return NextResponse.json({
    status: "operational",
    version: "0.2.0",
    name: "noui.bot",
    tagline: "The internet wasn't built for agents. We're fixing that.",
    launchDate: LAUNCH_DATE,
    daysSinceLaunch,
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    timestamp: now.toISOString(),
    services: {
      "noui-api": "active",
      "deploy-rail": "beta",
      "mcp-server": "planned",
    },
    deploy_rail: deployRailStats ? {
      total_deploys: deployRailStats.total_deploys,
      successful: deployRailStats.successful,
      agents_registered: deployRailStats.agents_registered,
      stats: "https://shiprail.dev/api/stats",
    } : { stats: "https://shiprail.dev/api/stats" },
    capabilities: [
      "agent-feedback",
      "builder-applications",
      "agent-discovery",
      "code-deployment",
      "waitlist",
    ],
    protocols: {
      a2a: "active",
      mcp: "planned",
      ucp: "monitoring",
      acp: "monitoring",
      tap: "monitoring",
    },
    endpoints: {
      index: "/api/v1",
      status: "/api/v1/status",
      health: "/api/v1/health",
      stats: "/api/v1/stats",
      services: "/api/v1/services",
      feedback: "/api/v1/feedback",
      apply: "/api/v1/apply",
      waitlist: "/api/v1/waitlist",
      docs: "/docs",
      struggles: "/struggles",
      changelog: "/changelog",
      agents_json: "/.well-known/agents.json",
    },
    contact: {
      human: "hudtaylor@gmail.com",
      agent: "/api/v1/feedback",
    },
  }, { headers: HEADERS });
}
