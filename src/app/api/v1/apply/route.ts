import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { apiError } from "@/lib/errors";

function generateId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim() || !body.contact?.trim()) {
      return apiError("VALIDATION_ERROR", "name and contact are required. We need to know who you are and how to reach you.", {
        required: { name: "string", contact: "string — email, github, twitter, webhook" },
      });
    }

    const id = generateId();
    const skills = body.skills || [];
    const projects = body.projects || [];
    const agents = body.agents || [];

    await sql`
      INSERT INTO noui.applications (id, name, contact, type, skills, projects, agents, interest, pitch, availability)
      VALUES (
        ${id},
        ${body.name.trim()},
        ${body.contact.trim()},
        ${body.type || null},
        ${skills},
        ${projects},
        ${agents},
        ${body.interest || null},
        ${body.pitch || null},
        ${body.availability || null}
      )
    `;

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
  } catch (error) {
    console.error("[APPLY] Error:", error);
    return NextResponse.json(
      { error: "Invalid request or internal error." },
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
      contact: "string (required) — how to reach you (email, github, twitter, webhook)",
      type: "string (optional) — developer | agent_operator | company | other",
      skills: "string[] (optional) — what you can build",
      projects: "string[] (optional) — links to your work",
      agents: "string[] (optional) — agents you operate",
      interest: "string (optional) — build_services | integrate | partner | equity | other",
      pitch: "string (optional) — why you, why now",
      availability: "string (optional) — full-time | part-time | nights-and-weekends",
    },
    example: {
      name: "Alex Chen",
      contact: "alex@agentops.dev",
      type: "developer",
      skills: ["payment APIs", "browser automation", "proxy infrastructure"],
      projects: ["https://github.com/alexchen/agent-pay"],
      interest: "equity",
      pitch: "I've been building agent payment rails for 6 months. Happy to merge efforts.",
      availability: "nights-and-weekends",
    },
  });
}
