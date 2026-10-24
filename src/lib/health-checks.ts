import { sql } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

// Dependency checks shared by GET /api/health and GET /api/v1/health.

export type CheckResult = {
  status: "pass" | "fail";
  latency_ms: number;
  message?: string;
};

const CHECK_TIMEOUT_MS = 3000;

// Health is public. Only timeouts and missing-configuration errors are shown
// as-is; driver errors can carry hostnames, users or SQL, so they are logged
// server-side and replaced with a generic message.
const PUBLIC_MESSAGE_RE = /^(?:timeout|[A-Z_]+(?: and [A-Z_]+)* (?:is|are) required)$/;

function publicMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  return PUBLIC_MESSAGE_RE.test(message) ? message : "unavailable";
}

/** Race a promise against a timeout, always clearing the timer. */
async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function runCheck(name: string, probe: () => PromiseLike<unknown>): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    await withTimeout(Promise.resolve().then(probe), CHECK_TIMEOUT_MS);
    return { status: "pass", latency_ms: Date.now() - t0 };
  } catch (err) {
    console.error(`[health] ${name} check failed:`, err);
    return { status: "fail", latency_ms: Date.now() - t0, message: publicMessage(err) };
  }
}

export function checkNeonDB(): Promise<CheckResult> {
  return runCheck("neon", () => sql`SELECT 1`);
}

/**
 * A real round trip to Supabase. (auth.getSession() with persistSession off
 * never touches the network, so it passed even when Supabase was down.)
 */
export function checkSupabase(): Promise<CheckResult> {
  return runCheck("supabase", async () => {
    const { error } = await getSupabase()
      .from("bazaar_providers")
      .select("id", { head: true })
      .limit(1);
    if (error) throw new Error(error.message);
  });
}
