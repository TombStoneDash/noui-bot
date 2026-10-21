import { createHash } from "crypto";
import { generateReceiptId, signReceipt } from "./receipts";

/**
 * Receipt-integrity kernel for the paid proxy path (POST /api/bazaar/proxy).
 * Pure where possible; every DB call takes the client as a parameter.
 */

// Minimal structural type for the Supabase client surface this module uses.
// Keeps the module testable with a fake client and independent of supabase-js generics.
export type BillingClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js query builder surface; kept loose so a fake client works in tests
  from(table: string): any;
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

export const PROXY_RECEIPT_VERIFY_URL = "https://noui.bot/verify";
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
/** Stored idempotent responses are honoured for 24 h; older rows are expired and purged. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** True when a stored row's `created_at` is older than the TTL. A missing/invalid timestamp is not expired. */
export function isIdempotencyExpired(createdAt: unknown, nowMs: number = Date.now()): boolean {
  if (typeof createdAt !== "string") return false;
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && nowMs - t > IDEMPOTENCY_TTL_MS;
}

/** PostgREST / Postgres codes meaning "the function does not exist" (SQL 008 not applied yet). */
const RPC_MISSING_CODES = new Set(["PGRST202", "42883"]);

export type DebitResult =
  | { ok: true; atomic: boolean; balance_cents: number }
  | { ok: false; atomic: true; balance_cents: number };

/**
 * Debit `cents` from a consumer. Tries the conditional-UPDATE RPC first
 * (`bazaar_debit_balance`), which cannot lose a concurrent update and refuses
 * when the balance does not cover the cost. If the function is absent, falls
 * back to the pre-008 read-modify-write and reports `atomic: false`.
 */
export async function debitAtomic(
  sb: BillingClient,
  consumerId: string,
  cents: number,
  knownBalanceCents: number
): Promise<DebitResult> {
  if (cents <= 0) return { ok: true, atomic: true, balance_cents: knownBalanceCents };

  const { data, error } = await sb.rpc("bazaar_debit_balance", { p_consumer: consumerId, p_cents: cents });

  if (error && error.code && RPC_MISSING_CODES.has(error.code)) {
    const nextBalance = knownBalanceCents - cents;
    const { error: updateErr } = await sb
      .from("bazaar_consumers")
      .update({ balance_cents: nextBalance, updated_at: new Date().toISOString() })
      .eq("id", consumerId);
    if (updateErr) throw new Error(`debit_failed: ${updateErr.message ?? "unknown"}`);
    return { ok: true, atomic: false, balance_cents: nextBalance };
  }

  if (error) throw new Error(`debit_failed: ${error.message ?? error.code ?? "unknown"}`);

  // A scalar SQL function whose UPDATE matched no row returns NULL.
  if (data === null || data === undefined) {
    return { ok: false, atomic: true, balance_cents: knownBalanceCents };
  }
  return { ok: true, atomic: true, balance_cents: Number(data) };
}

export type ProxyReceipt = {
  receipt_id: string;
  tool_id: string;
  tool_name: string | null;
  agent_id: string;
  provider_id: string;
  timestamp: string;
  duration_ms: number;
  cost_microcents: number;
  status: string;
  signature: string;
  verify_url: string;
};

/**
 * Build, sign and persist a receipt for one proxy call.
 * `cost_microcents = costCents * 10_000` (same unit as the meter route, #14).
 * Throws when the insert fails; the caller decides how to report that.
 */
export async function persistProxyReceipt(
  sb: BillingClient,
  params: {
    toolId: string;
    toolName: string | null;
    agentId: string;
    providerId: string;
    durationMs: number;
    costCents: number;
    status: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ProxyReceipt> {
  const timestamp = new Date().toISOString();
  const costMicrocents = params.costCents * 10_000;
  const receiptId = generateReceiptId();
  const canonical = {
    receipt_id: receiptId,
    tool_id: params.toolId,
    agent_id: params.agentId,
    provider_id: params.providerId,
    timestamp,
    cost_microcents: costMicrocents,
    status: params.status,
  };
  const signature = signReceipt(canonical);

  const { error } = await sb.from("bazaar_receipts").insert({
    ...canonical,
    tool_name: params.toolName,
    duration_ms: params.durationMs,
    signature,
    metadata: { ...(params.metadata ?? {}), source: "proxy" },
  });
  if (error) throw new Error(`receipt_insert_failed: ${error.message ?? error.code ?? "unknown"}`);

  return {
    ...canonical,
    tool_name: params.toolName,
    duration_ms: params.durationMs,
    signature,
    verify_url: PROXY_RECEIPT_VERIFY_URL,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

/** SHA-256 of the request body with object keys sorted, so key order does not change the hash. */
export function hashIdempotencyBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(body))).digest("hex");
}

export type StoredIdempotentResponse = {
  body_hash: string;
  status: number;
  body: unknown;
  headers: Record<string, string>;
};

export type IdempotencyLookup =
  | { kind: "miss"; available: boolean }
  | { kind: "hit"; stored: StoredIdempotentResponse }
  | { kind: "mismatch" };

/**
 * Look up a stored response for (consumer, key). A hit whose body hash differs
 * is a mismatch (caller returns 409). A lookup error (e.g. the table does not
 * exist yet) is treated as a miss with `available: false`. A row older than
 * the 24 h TTL is deleted and treated as a miss, so the key can be reused.
 */
export async function lookupIdempotency(
  sb: BillingClient,
  consumerId: string,
  key: string,
  bodyHash: string,
  nowMs: number = Date.now()
): Promise<IdempotencyLookup> {
  const { data, error } = await sb
    .from("bazaar_idempotency_keys")
    .select("response, created_at")
    .eq("consumer_id", consumerId)
    .eq("key", key)
    .maybeSingle();
  if (error) return { kind: "miss", available: false };
  if (!data) return { kind: "miss", available: true };
  const row = data as { response: StoredIdempotentResponse; created_at?: string };
  if (isIdempotencyExpired(row.created_at, nowMs)) {
    const { error: delErr } = await sb
      .from("bazaar_idempotency_keys")
      .delete()
      .eq("consumer_id", consumerId)
      .eq("key", key);
    // If the expired row cannot be removed, the new response cannot be stored under the key.
    return { kind: "miss", available: !delErr };
  }
  const stored = row.response;
  if (!stored || stored.body_hash !== bodyHash) return { kind: "mismatch" };
  return { kind: "hit", stored };
}

/** Store the final response under the key. Returns false (never throws) when the store fails. */
export async function storeIdempotency(
  sb: BillingClient,
  consumerId: string,
  key: string,
  receiptId: string | null,
  stored: StoredIdempotentResponse
): Promise<boolean> {
  const { error } = await sb
    .from("bazaar_idempotency_keys")
    .insert({ consumer_id: consumerId, key, receipt_id: receiptId, response: stored });
  return !error;
}

/**
 * Run `fn` once per (consumer, key): return the stored response on a hit,
 * 409-shaped `{ mismatch: true }` on a body-hash mismatch, else run `fn` and store.
 * Only 2xx results are stored, so a failed upstream call can be retried with the same key.
 */
export async function withIdempotency(
  sb: BillingClient,
  consumerId: string,
  key: string | null,
  bodyHash: string,
  fn: () => Promise<{ response: StoredIdempotentResponse; receiptId: string | null }>
): Promise<
  | { kind: "replay"; response: StoredIdempotentResponse }
  | { kind: "mismatch" }
  | { kind: "fresh"; response: StoredIdempotentResponse; receiptId: string | null; stored: boolean }
> {
  if (!key) {
    const out = await fn();
    return { kind: "fresh", ...out, stored: false };
  }
  const found = await lookupIdempotency(sb, consumerId, key, bodyHash);
  if (found.kind === "hit") return { kind: "replay", response: found.stored };
  if (found.kind === "mismatch") return { kind: "mismatch" };
  const out = await fn();
  const stored =
    found.available && out.response.status >= 200 && out.response.status < 300
      ? await storeIdempotency(sb, consumerId, key, out.receiptId, out.response)
      : false;
  return { kind: "fresh", ...out, stored };
}
