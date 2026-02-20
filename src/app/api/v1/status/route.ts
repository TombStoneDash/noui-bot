import { NextResponse } from "next/server";

const LAUNCH_DATE = "2026-02-19T00:00:00Z";
const startTime = Date.now();

export async function GET() {
  const now = new Date();
  const daysSinceLaunch = Math.floor(
    (now.getTime() - new Date(LAUNCH_DATE).getTime()) / (1000 * 60 * 60 * 24)
  );

  return NextResponse.json({
    status: "operational",
    version: "0.2.0",
    name: "noui.bot",
    tagline: "The internet wasn't built for agents. We're fixing that.",
    description: "Agent-first infrastructure platform — no forms, no CAPTCHAs, no UI required",
    launchDate: LAUNCH_DATE,
    daysSinceLaunch,
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    timestamp: now.toISOString(),
    capabilities: [
      "agent-identity",
      "agent-feedback",
      "builder-applications",
      "agent-discovery",
      "waitlist",
    ],
    endpoints: {
      status: "/api/v1/status",
      health: "/api/v1/health",
      init: "/api/v1/init",
      stats: "/api/v1/stats",
      feedback: "/api/v1/feedback",
      apply: "/api/v1/apply",
      waitlist: "/api/v1/waitlist",
      docs: "/docs",
      agentsJson: "/agents.json",
    },
    protocols: {
      agentsJson: true,
      a2a: "compatible",
    },
    contact: {
      human: "hudson@tombstonedash.com",
      agent: "/api/v1/init",
    },
  });
}
