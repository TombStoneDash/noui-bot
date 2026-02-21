import { NextResponse } from "next/server";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

const STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export function apiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  const status = STATUS_MAP[code];
  return NextResponse.json(
    {
      error: true,
      code,
      message,
      status,
      ...(details ? { details } : {}),
      docs: "https://noui.bot/docs",
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function methodNotAllowed(allowed: string[]): NextResponse {
  return NextResponse.json(
    {
      error: true,
      code: "METHOD_NOT_ALLOWED",
      message: `This endpoint accepts: ${allowed.join(", ")}`,
      status: 405,
      allowed_methods: allowed,
      docs: "https://noui.bot/docs",
    },
    { status: 405, headers: { Allow: allowed.join(", ") } }
  );
}
