import { NextResponse } from "next/server";
import { checkNeonDB, checkSupabase } from "@/lib/health-checks";

const APP_VERSION = "0.1.0";
const startTime = Date.now();

/**
 * GET /api/v1/health
 *
 * Versioned monitoring endpoint — returns structured health info with
 * dependency checks for Neon DB and Supabase.
 * Returns 200 when all checks pass, 503 on critical failure.
 */
export async function GET() {
  const [neon, supabase] = await Promise.all([
    checkNeonDB(),
    checkSupabase(),
  ]);

  const checks = { neon, supabase };

  const allPassed = Object.values(checks).every((c) => c.status === "pass");

  const status: "ok" | "degraded" | "down" = allPassed
    ? "ok"
    : neon.status === "fail"
      ? "down"
      : "degraded";

  const httpStatus = status === "down" ? 503 : 200;

  return NextResponse.json(
    {
      status,
      version: APP_VERSION,
      uptime_s: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  );
}
