import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/v1/stats
 * Returns aggregate counts only — no PII.
 * Check traction without logging into a dashboard.
 */
export async function GET() {
  try {
    const [waitlist] = await sql`SELECT COUNT(*)::int as count FROM noui.waitlist`;
    const [feedback] = await sql`SELECT COUNT(*)::int as count FROM noui.feedback`;
    const [applications] = await sql`SELECT COUNT(*)::int as count FROM noui.applications`;

    // Recent activity (last 24h)
    const [recentWaitlist] = await sql`
      SELECT COUNT(*)::int as count FROM noui.waitlist 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    const [recentFeedback] = await sql`
      SELECT COUNT(*)::int as count FROM noui.feedback 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    const [recentApps] = await sql`
      SELECT COUNT(*)::int as count FROM noui.applications 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    // Unique platforms reporting feedback
    const [platforms] = await sql`
      SELECT COUNT(DISTINCT platform)::int as count FROM noui.feedback 
      WHERE platform IS NOT NULL
    `;

    return NextResponse.json({
      totals: {
        waitlist: waitlist.count,
        feedback: feedback.count,
        applications: applications.count,
      },
      last_24h: {
        waitlist: recentWaitlist.count,
        feedback: recentFeedback.count,
        applications: recentApps.count,
      },
      unique_platforms: platforms.count,
      timestamp: new Date().toISOString(),
      note: "Counts only — no PII exposed.",
    });
  } catch (error) {
    console.error("[STATS] Error:", error);
    return NextResponse.json(
      { error: "Stats unavailable. Database may not be initialized.", hint: "POST /api/v1/init first." },
      { status: 500 }
    );
  }
}
