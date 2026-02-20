import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "operational",
    version: "0.1.0",
    name: "noui.bot",
    description: "Agent-first infrastructure platform",
    endpoints: {
      status: "/api/v1/status",
      health: "/api/v1/health",
      docs: "/docs",
      waitlist: "/api/v1/waitlist",
      feedback: "/api/v1/feedback",
      apply: "/api/v1/apply",
    },
  });
}
