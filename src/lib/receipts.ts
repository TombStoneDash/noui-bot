import { createHmac, randomBytes } from "crypto";

const SIGNING_SECRET = process.env.RECEIPT_SIGNING_SECRET || "noui-dev-secret-change-in-prod";

/**
 * True when RECEIPT_SIGNING_SECRET is set to a non-empty value.
 * Read at call time so the guard reflects the running process, not module load.
 */
export function signingSecretConfigured(): boolean {
  const value = process.env.RECEIPT_SIGNING_SECRET;
  return typeof value === "string" && value.length > 0;
}

/**
 * Fail closed on the paid path when production has no real signing secret.
 *
 * Throws `Error("receipt_signing_unconfigured")` when all of:
 *   - RECEIPT_SIGNING_SECRET is unset or empty
 *   - NODE_ENV === "production"
 *   - RECEIPT_SIGNING_ENFORCE === "true"
 *
 * Enforcement is behind RECEIPT_SIGNING_ENFORCE (default off) because the
 * production project did not have RECEIPT_SIGNING_SECRET set when this guard
 * shipped; turning it on without the secret would 503 every paid proxy call.
 * Dev/test keep the committed fallback so fixtures and /verify tests stay valid.
 */
export function requireSigningSecret(): void {
  if (signingSecretConfigured()) return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.RECEIPT_SIGNING_ENFORCE !== "true") return;
  throw new Error("receipt_signing_unconfigured");
}

/**
 * Generate a unique receipt ID: rcpt_ + 16 random hex chars
 */
export function generateReceiptId(): string {
  return `rcpt_${randomBytes(8).toString("hex")}`;
}

/**
 * Generate a unique dispute ID: disp_ + 16 random hex chars
 */
export function generateDisputeId(): string {
  return `disp_${randomBytes(8).toString("hex")}`;
}

/**
 * Sign a receipt using HMAC-SHA256.
 * Canonical string: receipt_id|tool_id|agent_id|provider_id|timestamp|cost_microcents|status
 */
export function signReceipt(params: {
  receipt_id: string;
  tool_id: string;
  agent_id: string;
  provider_id: string;
  timestamp: string;
  cost_microcents: number;
  status: string;
}): string {
  const canonical = [
    params.receipt_id,
    params.tool_id,
    params.agent_id,
    params.provider_id,
    params.timestamp,
    params.cost_microcents.toString(),
    params.status,
  ].join("|");

  return createHmac("sha256", SIGNING_SECRET).update(canonical).digest("hex");
}

/**
 * Verify a receipt signature.
 */
export function verifyReceipt(params: {
  receipt_id: string;
  tool_id: string;
  agent_id: string;
  provider_id: string;
  timestamp: string;
  cost_microcents: number;
  status: string;
  signature: string;
}): boolean {
  const expected = signReceipt(params);
  return expected === params.signature;
}
