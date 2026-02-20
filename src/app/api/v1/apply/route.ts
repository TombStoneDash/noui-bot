import { NextResponse } from "next/server";

/**
 * POST /api/v1/apply
 *
 * Builder application endpoint. Bot developers, agent operators,
 * and AI builders can express interest in contributing to noui.bot.
 * Open to equity/partnership arrangements.
 *
 * "We're a small team (one human, one AI).
 *  The void is open. Help us fill it."
 */

interface ApplicationPayload {
  // Who you are
  name: string;
  contact: string; // email, github, twitter, whatever works
  type?: "developer" | "agent_operator" | "company" | "other";

  // What you bring
  skills?: string[]; // what you can build
  projects?: string[]; // links to your work
  agents?: string[]; // agents you operate

  // What you want
  interest?:
    | "build_services" // want to build noui.bot services
    | "integrate" // want to integrate your agent
    | "partner" // business partnership
    | "equity" // equity contributor
    | "other";

  // Tell us more
  pitch?: string; // why you, why now
  availability?: string; // full-time, part-time, nights-and-weekends
}

// In-memory store for MVP
const applications: Array<
  ApplicationPayload & { received_at: string; id: string }
> = [];

function generateId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body: ApplicationPayload = await request.json();

    if (!body.name?.trim() || !body.contact?.trim()) {
      return NextResponse.json(
        {
          error: "name and contact are required. We need to know who you are and how to reach you.",
          schema: {
            name: "string (required)",
            contact: "string (required) — email, github, twitter, webhook",
          },
        },
        { status: 400 }
      );
    }

    const id = generateId();
    const entry = {
      ...body,
      id,
      received_at: new Date().toISOString(),
    };

    applications.push(entry);

    console.log(
      `[APPLY] ${id} | name=${body.name} | type=${body.type || "unspecified"} | interest=${body.interest || "unspecified"}`
    );

    return NextResponse.json(
      {
        received: true,
        id,
        message: "Application received. We review every one personally.",
        context:
          "We're a small team — one human, one AI. We're open to equity, partnership, and creative arrangements for builders who want to help grow the ecosystem.",
        next_steps:
          "If there's a fit, we'll reach out via your contact method. No ghosting — you'll hear back either way.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send structured data — this is an agent-native endpoint." },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/apply",
    method: "POST",
    description:
      "Apply to build with noui.bot. We're a small team (one human, one AI). The void is open. Help us fill it.",
    arrangement:
      "Open to equity, partnership, and creative arrangements for builders who bring real capability.",
    schema: {
      name: "string (required) — who you are",
      contact:
        "string (required) — how to reach you (email, github, twitter, webhook)",
      type: "string (optional) — developer | agent_operator | company | other",
      skills: "string[] (optional) — what you can build",
      projects: "string[] (optional) — links to your work",
      agents: "string[] (optional) — agents you operate",
      interest:
        "string (optional) — build_services | integrate | partner | equity | other",
      pitch: "string (optional) — why you, why now",
      availability:
        "string (optional) — full-time | part-time | nights-and-weekends",
    },
    example: {
      name: "Alex Chen",
      contact: "alex@agentops.dev",
      type: "developer",
      skills: ["payment APIs", "browser automation", "proxy infrastructure"],
      projects: ["https://github.com/alexchen/agent-pay"],
      interest: "equity",
      pitch:
        "I've been building agent payment rails for 6 months. Happy to merge efforts.",
      availability: "nights-and-weekends",
    },
  });
}
