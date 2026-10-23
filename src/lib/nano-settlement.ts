// Nano (XNO) send-block verification for a proposed per-call settlement rail
// (GitHub issue #12). Standalone and dependency-free: nothing in the proxy or
// billing path imports this yet. See docs/nano-settlement-rail.md.

// BigInt() rather than literals: the app tsconfig targets ES2017.
const ZERO = BigInt(0);

/** 1 XNO = 10^30 raw. */
export const RAW_PER_XNO = BigInt(10) ** BigInt(30);

const XNO_DECIMALS = 30;
const ACCOUNT_RE = /^(?:nano|xrb)_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/;
const BLOCK_HASH_RE = /^[0-9A-Fa-f]{64}$/;
const RAW_RE = /^(?:0|[1-9][0-9]*)$/;
const XNO_RE = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

export type NanoVerifyReason =
  | "ok"
  | "bad_hash"
  | "bad_expectation"
  | "malformed_block"
  | "not_state_block"
  | "not_send"
  | "unconfirmed"
  | "wrong_recipient"
  | "wrong_payer"
  | "wrong_amount";

export type NanoSettlementExpectation = {
  /** Provider's receive address (nano_… or legacy xrb_…). */
  payTo: string;
  /** Exact amount owed, in raw. */
  amountRaw: bigint;
  /** If set, the block must be sent from this account. */
  payer?: string;
};

export type NanoVerifyOutcome = {
  valid: boolean;
  reason: NanoVerifyReason;
  /** Upper-case block hash; callers must claim it once to stop replay. */
  hash?: string;
  payer?: string;
  recipient?: string;
  amountRaw?: string;
};

/** True for a well-formed nano_/xrb_ address. Does not check the blake2b checksum. */
export function isNanoAccount(value: unknown): value is string {
  return typeof value === "string" && ACCOUNT_RE.test(value);
}

/** Canonical comparison form: legacy xrb_ prefix becomes nano_. */
export function normalizeNanoAccount(account: string): string {
  return account.startsWith("xrb_") ? `nano_${account.slice(4)}` : account;
}

/** Parse a decimal XNO string ("0.0001") to raw without floating point. */
export function xnoToRaw(xno: string): bigint {
  if (typeof xno !== "string" || !XNO_RE.test(xno)) {
    throw new RangeError(`Invalid XNO amount: ${String(xno)}`);
  }
  const [whole, fraction = ""] = xno.split(".");
  if (fraction.length > XNO_DECIMALS) {
    throw new RangeError(`XNO amount has more than ${XNO_DECIMALS} decimal places: ${xno}`);
  }
  return BigInt(whole) * RAW_PER_XNO + BigInt(fraction.padEnd(XNO_DECIMALS, "0"));
}

/** Format raw as a decimal XNO string with no trailing zeros. */
export function rawToXno(raw: bigint): string {
  if (typeof raw !== "bigint" || raw < ZERO) {
    throw new RangeError(`Invalid raw amount: ${String(raw)}`);
  }
  const whole = raw / RAW_PER_XNO;
  const fraction = (raw % RAW_PER_XNO).toString().padStart(XNO_DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Check a Nano RPC `block_info` response (json_block: true) against what the
 * caller owes. Only a confirmed state send of exactly `amountRaw` to `payTo`
 * is valid. This proves payment, not uniqueness: the caller must record the
 * returned hash atomically (e.g. a unique column) and reject a second use.
 */
export function verifyNanoSendBlock(
  hash: unknown,
  blockInfo: unknown,
  expected: NanoSettlementExpectation,
): NanoVerifyOutcome {
  if (typeof hash !== "string" || !BLOCK_HASH_RE.test(hash)) {
    return { valid: false, reason: "bad_hash" };
  }
  const blockHash = hash.toUpperCase();
  if (
    !isNanoAccount(expected?.payTo) ||
    typeof expected.amountRaw !== "bigint" ||
    expected.amountRaw <= ZERO ||
    (expected.payer !== undefined && !isNanoAccount(expected.payer))
  ) {
    return { valid: false, reason: "bad_expectation", hash: blockHash };
  }

  const outcome = (reason: NanoVerifyReason, details: Partial<NanoVerifyOutcome> = {}): NanoVerifyOutcome => ({
    valid: reason === "ok", reason, hash: blockHash, ...details,
  });

  if (!isRecord(blockInfo) || !isRecord(blockInfo.contents)) return outcome("malformed_block");
  const contents = blockInfo.contents;
  if (contents.type !== "state") return outcome("not_state_block");
  if (blockInfo.subtype !== "send") return outcome("not_send");

  const amount = blockInfo.amount;
  const payer = blockInfo.block_account ?? contents.account;
  const recipient = contents.link_as_account;
  if (typeof amount !== "string" || !RAW_RE.test(amount) || !isNanoAccount(payer) || !isNanoAccount(recipient)) {
    return outcome("malformed_block");
  }
  const details = {
    payer: normalizeNanoAccount(payer),
    recipient: normalizeNanoAccount(recipient),
    amountRaw: amount,
  };

  // The RPC returns confirmed as the string "true" (or a boolean in some clients).
  if (blockInfo.confirmed !== "true" && blockInfo.confirmed !== true) return outcome("unconfirmed", details);
  if (details.recipient !== normalizeNanoAccount(expected.payTo)) return outcome("wrong_recipient", details);
  if (expected.payer !== undefined && details.payer !== normalizeNanoAccount(expected.payer)) {
    return outcome("wrong_payer", details);
  }
  if (BigInt(amount) !== expected.amountRaw) return outcome("wrong_amount", details);
  return outcome("ok", details);
}

export type NanoRpcOptions = {
  fetch?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Fetch `block_info` for a hash from a Nano node RPC endpoint. Returns null
 * when the node does not know the block. Throws on transport or RPC errors.
 */
export async function fetchNanoBlockInfo(
  rpcUrl: string,
  hash: string,
  { fetch: fetchImpl = fetch, timeoutMs = 5_000 }: NanoRpcOptions = {},
): Promise<Record<string, unknown> | null> {
  if (!BLOCK_HASH_RE.test(hash)) throw new RangeError("Invalid Nano block hash");
  const res = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "block_info", json_block: "true", hash: hash.toUpperCase() }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Nano RPC returned HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!isRecord(body)) throw new Error("Nano RPC returned a non-object body");
  if (typeof body.error === "string") {
    if (/block not found/i.test(body.error)) return null;
    throw new Error(`Nano RPC error: ${body.error}`);
  }
  return body;
}
