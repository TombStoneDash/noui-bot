import { timingSafeEqual } from "node:crypto";
import { signReceipt } from "./receipts";

export type VerifyOutcome = {
  valid: boolean;
  reason: "ok" | "missing_fields" | "bad_receipt_id" | "bad_signature_format" | "signature_mismatch";
  missing?: string[];
  checked: { canonical: string; algorithm: "HMAC-SHA256" };
  verified_at: string;
};

const CANONICAL_FIELDS = [
  "receipt_id", "tool_id", "agent_id", "provider_id", "timestamp", "cost_microcents", "status",
] as const;
const REQUIRED_FIELDS = [...CANONICAL_FIELDS, "signature"] as const;

export function verifyReceiptEnvelope(input: unknown): VerifyOutcome {
  const fields: Record<string, unknown> =
    input !== null && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown>
      : {};
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = fields[field];
    return !Object.hasOwn(fields, field) || (field === "cost_microcents"
      ? !Number.isInteger(value)
      : typeof value !== "string" || value.length === 0);
  });
  const checked: VerifyOutcome["checked"] = {
    // A canonical string exists only when all seven fields have the correct types.
    canonical: CANONICAL_FIELDS.some((field) => missing.includes(field))
      ? ""
      : CANONICAL_FIELDS.map((field) => fields[field]).join("|"),
    algorithm: "HMAC-SHA256",
  };
  const verified_at = new Date().toISOString();
  const outcome = (reason: VerifyOutcome["reason"]): VerifyOutcome => ({
    valid: reason === "ok", reason, checked, verified_at,
  });

  if (missing.length > 0) {
    return { ...outcome("missing_fields"), missing };
  }

  // Every field has been validated above; do not normalize signed values.
  const receipt = fields as Parameters<typeof signReceipt>[0] & { signature: string };
  if (!/^rcpt_[0-9a-f]{16,}$/.test(receipt.receipt_id)) {
    return outcome("bad_receipt_id");
  }
  if (!/^[0-9a-f]{64}$/.test(receipt.signature)) {
    return outcome("bad_signature_format");
  }

  const expected = Buffer.from(signReceipt(receipt), "hex");
  const actual = Buffer.from(receipt.signature, "hex");
  return outcome(timingSafeEqual(expected, actual) ? "ok" : "signature_mismatch");
}
