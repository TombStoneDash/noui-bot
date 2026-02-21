import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Inline rate limiter (Edge runtime compatible)
const store = new Map<string, { count: number; resetAt: number }>();

const ROUTE_LIMITS: Record<string, number> = {
  "/api/v1/waitlist": 10,
  "/api/v1/feedback": 30,
  "/api/v1/apply": 10,
  "/api/v1/stats": 60,
  "/api/v1/services": 60,
  "/api/v1/health": 120,
  "/api/v1/status": 60,
  "/api/v1": 100,
};

function checkRate(ip: string, pathname: string): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  const limit = ROUTE_LIMITS[pathname] ?? 100;
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  
  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + 60_000 };
    store.set(key, entry);
  }
  entry.count++;
  
  return {
    allowed: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function middleware(request: NextRequest) {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const result = checkRate(ip, pathname);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: true,
          code: "RATE_LIMITED",
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          limit: result.limit,
          remaining: 0,
          retry_after: retryAfter,
          docs: "https://noui.bot/docs#rate-limits",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "Access-Control-Allow-Origin": "*",
            "X-Noui-Version": "0.2.0",
          },
        }
      );
    }
  }

  const response = NextResponse.next();

  // Standard headers for API responses
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Noui-Version", "0.2.0");
    response.headers.set("X-Noui-Docs", "https://noui.bot/docs");
    response.headers.set("X-Noui-Discovery", "https://noui.bot/.well-known/agents.json");
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("X-Response-Time", `${Date.now() - start}ms`);
  }

  // Security headers for all responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
