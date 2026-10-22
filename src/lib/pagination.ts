/**
 * Parse `limit` / `offset` query params for list endpoints.
 *
 * `parseInt` accepted "abc" (NaN), "-5" and "10abc", which reached PostgREST
 * as `.range(NaN, NaN)` or a negative range and surfaced as a 500 or an empty
 * page. Values must be written using digits only; limit is clamped to `max`.
 */
export type Pagination = { limit: number; offset: number };

export function parsePagination(
  params: URLSearchParams,
  { defaultLimit, maxLimit }: { defaultLimit: number; maxLimit: number }
): Pagination | { error: string } {
  const limitParam = params.get("limit");
  const offsetParam = params.get("offset");

  const requestedLimit = limitParam === null ? defaultLimit : Number(limitParam);
  if (
    (limitParam !== null && !/^[0-9]+$/.test(limitParam)) ||
    !Number.isSafeInteger(requestedLimit) ||
    requestedLimit <= 0
  ) {
    return { error: "limit must be a positive safe integer written using digits only" };
  }

  const offset = offsetParam === null ? 0 : Number(offsetParam);
  if (
    (offsetParam !== null && !/^[0-9]+$/.test(offsetParam)) ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    return { error: "offset must be a nonnegative safe integer written using digits only" };
  }

  const limit = Math.min(requestedLimit, maxLimit);
  if (offset > Number.MAX_SAFE_INTEGER - (limit - 1)) {
    return { error: "pagination range end exceeds the maximum safe integer" };
  }

  return { limit, offset };
}
