import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const WAITLIST_FILE = path.join(process.cwd(), "data", "waitlist.json");

async function getWaitlist(): Promise<string[]> {
  try {
    const data = await fs.readFile(WAITLIST_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWaitlist(emails: string[]) {
  await fs.mkdir(path.dirname(WAITLIST_FILE), { recursive: true });
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(emails, null, 2));
}

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
    const waitlist = await getWaitlist();

    if (waitlist.includes(normalized)) {
      return NextResponse.json(
        { message: "Already on the list.", email: normalized },
        { status: 200 }
      );
    }

    waitlist.push(normalized);
    await saveWaitlist(waitlist);

    return NextResponse.json(
      { message: "Added to waitlist.", email: normalized, position: waitlist.length },
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
