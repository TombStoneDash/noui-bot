import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required." },
        { status: 400 }
      );
    }

    const normalized = email.toLowerCase().trim();
    const src = source || "api";

    // Upsert — don't fail on duplicate
    const result = await sql`
      INSERT INTO noui.waitlist (email, source)
      VALUES (${normalized}, ${src})
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, created_at
    `;

    if (result.length === 0) {
      // Already exists
      return NextResponse.json(
        { message: "Already on the list.", email: normalized },
        { status: 200 }
      );
    }

    console.log(`[WAITLIST] New signup: ${normalized} | id=${result[0].id}`);

    return NextResponse.json(
      {
        message: "Added to waitlist.",
        email: normalized,
        id: result[0].id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[WAITLIST] Error:", error);
    return NextResponse.json(
      { error: "Internal error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/waitlist",
    method: "POST",
    body: { email: "string (required)", source: "string (optional)" },
    description: "Join the noui.bot waitlist. Persistent storage — your signup survives redeploys.",
  });
}
