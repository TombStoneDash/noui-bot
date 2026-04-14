import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

const APP_VERSION = "0.1.0";
const startTime = Date.now();

type CheckStatus = "pass" | "fail";

interface CheckResult {
  status: CheckStatus;
  latency_ms: number;
  message?: string;
}

/**
 * Race a promise against a timeout. Returns the result or a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function checkNeonDB(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    await withTimeout(sql`SELECT 1`, 3000);
    return { status: "pass", latency_ms: Date.now() - t0 };
  } catch (err) {
    return {
      status: "fail",
      latency_ms: Date.now() - t0,
      message: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function checkSupabase(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const supabase = getSupabase();
    // Lightweight auth health check — no table read needed
    await withTimeout(
      supabase.auth.getSession().then(() => {}),
      3000
    );
    return { status: "pass", latency_ms: Date.now() - t0 };
  } catch (err) {
    return {
      status: "fail",
      latency_ms: Date.now() - t0,
      message: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/**
 * GET /api/health
 *
 * Monitoring endpoint — returns structured health info with dependency checks.
 * Returns 200 when all checks pass, 503 on any critical failure.
 */
export async function GET() {
  const [neon, supabase] = await Promise.all([
    checkNeonDB(),
    checkSupabase(),
  ]);

  const checks = { neon, supabase };

  const allPassed = Object.values(checks).every((c) => c.status === "pass");
  const anyFailed = Object.values(checks).some((c) => c.status === "fail");

  const status: "ok" | "degraded" | "down" = allPassed
    ? "ok"
    : anyFailed
      ? neon.status === "fail"
        ? "down" // DB is critical
        : "degraded"
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
