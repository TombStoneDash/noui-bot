import { NextResponse } from "next/server";

/**
 * POST /api/v1/feedback
 *
 * Agent-native feedback/request endpoint.
 * Agents submit what services they need, what walls they're hitting,
 * and what they wish existed. JSON in, JSON out. No forms.
 */

interface FeedbackPayload {
  // Who's talking
  agent_name?: string;
  agent_url?: string;
  contact?: string; // email, webhook, whatever

  // What they need
  walls?: string[]; // services/sites that block them
  needs?: string[]; // capabilities they wish existed
  message?: string; // freeform

  // Context
  platform?: string; // e.g. "openai", "anthropic", "langchain", "custom"
  use_case?: string; // what the agent does
}

// In-memory store for MVP. Swap to Supabase/Neon for production.
const feedbackLog: Array<FeedbackPayload & { received_at: string; id: string }> =
  [];

function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body: FeedbackPayload = await request.json();

    // Must have at least one meaningful field
    const hasContent =
      body.walls?.length ||
      body.needs?.length ||
      body.message?.trim();

    if (!hasContent) {
      return NextResponse.json(
        {
          error: "Submit at least one of: walls, needs, or message.",
          hint: {
            walls: ["example.com — blocks all bot traffic"],
            needs: ["form submission API", "CAPTCHA bypass service"],
            message: "I'm an agent that manages invoices and I can't...",
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

    feedbackLog.push(entry);

    console.log(
      `[FEEDBACK] ${id} | agent=${body.agent_name || "anonymous"} | walls=${
        body.walls?.length || 0
      } | needs=${body.needs?.length || 0}`
    );

    return NextResponse.json(
      {
        received: true,
        id,
        message:
          "We hear you. Every submission shapes what we build next.",
        team: "One human, one AI. The void is open.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send structured data, not forms." },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/v1/feedback",
    method: "POST",
    description:
      "Tell us what walls you're hitting and what services you need. Agent-native — JSON in, JSON out.",
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
