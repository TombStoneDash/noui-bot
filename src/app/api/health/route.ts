import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    healthy: true,
    timestamp: new Date().toISOString(),
    version: "0.5.0",
  });
}
