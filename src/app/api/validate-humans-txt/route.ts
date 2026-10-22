import { NextRequest, NextResponse } from "next/server";
import { checkPublicUrl } from "@/lib/public-url";

const MAX_REDIRECTS = 3;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // The server fetches this URL, so only public hosts are allowed (SSRF).
  const first = await checkPublicUrl(url);
  if (!first.ok) {
    return NextResponse.json({ error: first.reason }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // Follow redirects by hand so every hop gets the same public-host check.
    let target = first.url.href;
    let res: Response;
    for (let hop = 0; ; hop++) {
      res = await fetch(target, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "humans-txt-validator/1.0 (noui.bot)",
          Accept: "application/json, text/plain",
        },
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) break;
      if (hop >= MAX_REDIRECTS) {
        return NextResponse.json({ error: "Too many redirects" }, { status: 502 });
      }
      const next = await checkPublicUrl(new URL(location, target).href);
      if (!next.ok) {
        return NextResponse.json({ error: `Redirect rejected: ${next.reason}` }, { status: 502 });
      }
      target = next.url.href;
    }

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
  } finally {
    clearTimeout(timeout);
  }
}
