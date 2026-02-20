import { NextResponse } from "next/server";
import { initDB } from "@/lib/db";

/**
 * POST /api/v1/init
 * Initialize database schema. Idempotent — safe to call multiple times.
 */
export async function POST() {
  try {
    await initDB();
    return NextResponse.json({
      initialized: true,
      message: "Database schema created/verified.",
      tables: ["noui.waitlist", "noui.feedback", "noui.applications"],
    });
  } catch (error) {
    console.error("[INIT] Database initialization failed:", error);
    return NextResponse.json(
      { error: "Database initialization failed.", details: String(error) },
      { status: 500 }
    );
  }
}
