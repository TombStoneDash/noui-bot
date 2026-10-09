import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { apiError } from "@/lib/errors";

function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON request body.");
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return apiError("VALIDATION_ERROR", "Request body must be a JSON object.");
  }

  if (
    (body.walls !== undefined && (!Array.isArray(body.walls) || !body.walls.every((value) => typeof value === "string"))) ||
    (body.needs !== undefined && (!Array.isArray(body.needs) || !body.needs.every((value) => typeof value === "string"))) ||
    (body.message !== undefined && typeof body.message !== "string")
  ) {
    return apiError("VALIDATION_ERROR", "walls and needs must be arrays of strings; message must be a string.");
  }

  const walls = (body.walls as string[] | undefined) ?? [];
  const needs = (body.needs as string[] | undefined) ?? [];
  const message = body.message as string | undefined;
  const hasContent =
    walls.some((value) => value.trim().length > 0) ||
    needs.some((value) => value.trim().length > 0) ||
    Boolean(message?.trim());

  if (!hasContent) {
    return apiError("VALIDATION_ERROR", "Submit at least one of: walls, needs, or message.", {
      hint: {
        walls: ["example.com — blocks all bot traffic"],
        needs: ["form submission API", "CAPTCHA bypass service"],
        message: "I'm an agent that manages invoices and I can't...",
      },
    });
  }

  try {
    const id = generateId();

    await sql`
      INSERT INTO noui.feedback (id, agent_name, agent_url, contact, walls, needs, message, platform, use_case)
      VALUES (
        ${id},
        ${body.agent_name || null},
        ${body.agent_url || null},
        ${body.contact || null},
        ${walls},
        ${needs},
        ${message || null},
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
    return apiError("INTERNAL_ERROR", "Unable to save feedback. Please try again later.");
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
