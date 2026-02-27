import { createHmac, randomBytes } from "crypto";

const SIGNING_SECRET = process.env.RECEIPT_SIGNING_SECRET || "noui-dev-secret-change-in-prod";

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
