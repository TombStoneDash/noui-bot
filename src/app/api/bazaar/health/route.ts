import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const startedAt = Date.now();

export async function GET() {
  const sb = getSupabase();

  try {
    const [{ count: providerCount }, { count: toolCount }] = await Promise.all([
      sb.from("bazaar_providers").select("id", { count: "exact", head: true }).eq("active", true),
      sb.from("bazaar_tools").select("id", { count: "exact", head: true }).eq("active", true),
    ]);

    const uptimeMs = Date.now() - startedAt;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);

    return NextResponse.json({
      status: "ok",
      provider_count: providerCount ?? 0,
      tool_count: toolCount ?? 0,
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({
      status: "degraded",
      provider_count: null,
      tool_count: null,
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
