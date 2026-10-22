import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { initDB } from "@/lib/db";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True when the request carries `Authorization: Bearer <INIT_SECRET>`. */
function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  // Compare fixed-length digests so the check does not leak the secret's length.
  return timingSafeEqual(digest(match[1].trim()), digest(secret));
}

/**
 * POST /api/v1/init
 * Initialize database schema. Idempotent — safe to call multiple times.
 * Operator-only: requires `Authorization: Bearer $INIT_SECRET`, and is
 * disabled entirely when INIT_SECRET is not configured.
 */
export async function POST(request: Request) {
  const secret = process.env.INIT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Database initialization is disabled on this deployment." },
      { status: 503 }
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await initDB();
    return NextResponse.json({
      initialized: true,
      message: "Database schema created/verified.",
      tables: ["noui.waitlist", "noui.feedback", "noui.applications"],
    });
  } catch (error) {
    // Details can name the database, role or host; keep them in server logs only.
    console.error("[INIT] Database initialization failed:", error);
    return NextResponse.json(
      { error: "Database initialization failed." },
      { status: 500 }
    );
  }
}
