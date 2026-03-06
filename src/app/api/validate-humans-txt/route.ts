import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "humans-txt-validator/1.0 (noui.bot)",
        Accept: "application/json, text/plain",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const text = await res.text();

    try {
      const json = JSON.parse(text);
      return NextResponse.json(json);
    } catch {
      // Not valid JSON — return as-is with error
      return NextResponse.json(
        { error: "Response is not valid JSON", raw: text.slice(0, 500) },
        { status: 422 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
