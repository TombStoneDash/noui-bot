import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    healthy: true,
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
