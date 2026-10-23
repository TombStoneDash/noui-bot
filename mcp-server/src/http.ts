export const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_BODY_CHARS = 500;

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

function errorResult(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

/**
 * Call a JSON API and turn the outcome into an MCP tool result.
 *
 * Network failures, timeouts, non-2xx statuses and non-JSON bodies become
 * `isError: true` results the agent can read, instead of an exception that
 * surfaces as an opaque protocol error (or a call that never returns).
 */
export async function callJsonApi(
  url: string,
  init: RequestInit = {},
  { fetchImpl = fetch as Fetch, timeoutMs = REQUEST_TIMEOUT_MS }: { fetchImpl?: Fetch; timeoutMs?: number } = {},
): Promise<ToolResult> {
  const label = `${init.method ?? "GET"} ${url}`;
  let res: Response;
  let text: string;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    text = await res.text();
  } catch (error) {
    const reason = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? `timed out after ${timeoutMs / 1000}s`
      : error instanceof Error ? error.message : String(error);
    return errorResult(`${label} failed: ${reason}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    const snippet = text.trim().slice(0, MAX_ERROR_BODY_CHARS);
    return errorResult(`${label} returned HTTP ${res.status} with a non-JSON body${snippet ? `: ${snippet}` : ""}`);
  }

  const body = JSON.stringify(data, null, 2);
  if (!res.ok) {
    return errorResult(`${label} returned HTTP ${res.status}:\n${body}`);
  }
  return { content: [{ type: "text", text: body }] };
}

/** Encode one URL path segment so caller input cannot change the path or query. */
export function pathSegment(value: string): string {
  return encodeURIComponent(value);
}
