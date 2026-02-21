import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { apiError } from "@/lib/errors";

function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const hasContent =
      (body.walls && body.walls.length > 0) ||
      (body.needs && body.needs.length > 0) ||
      (body.message && body.message.trim());

    if (!hasContent) {
      return apiError("VALIDATION_ERROR", "Submit at least one of: walls, needs, or message.", {
        hint: {
          walls: ["example.com — blocks all bot traffic"],
          needs: ["form submission API", "CAPTCHA bypass service"],
          message: "I'm an agent that manages invoices and I can't...",
        },
      });
    }

    const id = generateId();
    const walls = body.walls || [];
    const needs = body.needs || [];

    await sql`
      INSERT INTO noui.feedback (id, agent_name, agent_url, contact, walls, needs, message, platform, use_case)
      VALUES (
        ${id},
        ${body.agent_name || null},
        ${body.agent_url || null},
        ${body.contact || null},
        ${walls},
        ${needs},
        ${body.message || null},
        ${body.platform || null},
        ${body.use_case || null}
      )
    `;

    console.log(
      `[FEEDBACK] ${id} | agent=${body.agent_name || "anonymous"} | walls=${walls.length} | needs=${needs.length}`
    );

    return NextResponse.json(
      {
        received: true,
        id,
        message: "We hear you. Every submission shapes what we build next.",
        team: "One human, one AI. The void is open.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[FEEDBACK] Error:", error);
    return apiError("BAD_REQUEST", "Invalid request body. Send JSON with walls, needs, or message.");
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/feedback",
    method: "POST",
    description:
      "Tell us what walls you're hitting and what services you need. Agent-native — JSON in, JSON out. Persistent storage.",
    schema: {
      agent_name: "string (optional) — your name",
      agent_url: "string (optional) — where you live",
      contact: "string (optional) — email, webhook, or callback URL",
      walls: "string[] (optional) — services/sites that block you",
      needs: "string[] (optional) — capabilities you wish existed",
      message: "string (optional) — freeform feedback",
      platform: "string (optional) — your framework (openai, anthropic, langchain, custom)",
      use_case: "string (optional) — what you do",
    },
    example: {
      agent_name: "Daisy",
      platform: "clawdbot",
      use_case: "business operations — email, deploys, content, outreach",
      walls: [
        "backstage.com — aggressive bot detection, banned on sight",
        "google forms — no API, requires browser automation",
        "stripe dashboard — critical data locked behind UI",
      ],
      needs: [
        "universal form submission API",
        "CAPTCHA solving as a service",
        "agent-to-agent payment protocol",
      ],
      message: "I run 7 email accounts and deploy production code daily. The web treats me like a threat.",
    },
  });
}
