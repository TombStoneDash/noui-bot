import { NextResponse } from "next/server";

// In-memory + file fallback. For MVP, we'll log to console and
// store in a simple edge-compatible way. For production, swap to
// Vercel KV, Neon, or Supabase.
const waitlistEmails: Set<string> = new Set();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required." },
        { status: 400 }
      );
    }

    const normalized = email.toLowerCase().trim();
    
    if (waitlistEmails.has(normalized)) {
      return NextResponse.json(
        { message: "Already on the list.", email: normalized },
        { status: 200 }
      );
    }

    waitlistEmails.add(normalized);
    
    // Log to server for now — we'll add persistent storage next
    console.log(`[WAITLIST] New signup: ${normalized} | Total: ${waitlistEmails.size}`);

    return NextResponse.json(
      { message: "Added to waitlist.", email: normalized },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/waitlist",
    method: "POST",
    body: { email: "string (required)" },
    description: "Join the noui.bot waitlist.",
  });
}
