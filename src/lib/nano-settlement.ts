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

/**
 * True for a well-formed nano_/xrb_ address. Format only: use
 * isValidNanoAccount for anything a person typed or a provider registered.
 */
export function isNanoAccount(value: unknown): value is string {
  return typeof value === "string" && ACCOUNT_RE.test(value);
}

/** Canonical comparison form: legacy xrb_ prefix becomes nano_. */
export function normalizeNanoAccount(account: string): string {
  return account.startsWith("xrb_") ? `nano_${account.slice(4)}` : account;
}

// --- Address checksum -------------------------------------------------------
// An address is "nano_" + 52 base32 chars (4 zero pad bits + the 256-bit
// public key) + 8 base32 chars (blake2b-40 of the key, byte-reversed).

const NANO_ALPHABET = "13456789abcdefghijkmnopqrstuwxyz";
const PUBLIC_KEY_RE = /^[0-9A-Fa-f]{64}$/;
const MASK_64 = (BigInt(1) << BigInt(64)) - BigInt(1);
const BLAKE2B_IV = [
  "6a09e667f3bcc908", "bb67ae8584caa73b", "3c6ef372fe94f82b", "a54ff53a5f1d36f1",
  "510e527fade682d1", "9b05688c2b3e6c1f", "1f83d9abfb41bd6b", "5be0cd19137e2179",
].map((hex) => BigInt(`0x${hex}`));
const BLAKE2B_SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
];

function rotr64(x: bigint, n: number): bigint {
  return ((x >> BigInt(n)) | (x << BigInt(64 - n))) & MASK_64;
}

/**
 * Unkeyed BLAKE2b (RFC 7693) with a 1–64 byte digest. Node's crypto only
 * offers the 64-byte variant, and the digest length is part of BLAKE2b's
 * parameter block, so a truncated blake2b512 would give the wrong checksum.
 * BigInt is slow but the inputs here are 32 bytes.
 */
export function blake2b(input: Uint8Array, outLength: number): Uint8Array {
  if (!Number.isInteger(outLength) || outLength < 1 || outLength > 64) {
    throw new RangeError("BLAKE2b digest length must be 1-64 bytes");
  }
  const h = BLAKE2B_IV.slice();
  h[0] ^= BigInt(0x01010000 ^ outLength);

  const blockCount = Math.max(1, Math.ceil(input.length / 128));
  for (let block = 0; block < blockCount; block++) {
    const last = block === blockCount - 1;
    const m: bigint[] = [];
    for (let w = 0; w < 16; w++) {
      let word = ZERO;
      for (let b = 7; b >= 0; b--) {
        word = (word << BigInt(8)) | BigInt(input[block * 128 + w * 8 + b] ?? 0);
      }
      m.push(word);
    }
    const counter = BigInt(last ? input.length : (block + 1) * 128);
    const v = [...h, ...BLAKE2B_IV];
    v[12] ^= counter & MASK_64;
    v[13] ^= counter >> BigInt(64);
    if (last) v[14] ^= MASK_64;

    const g = (a: number, b: number, c: number, d: number, x: bigint, y: bigint) => {
      v[a] = (v[a] + v[b] + x) & MASK_64;
      v[d] = rotr64(v[d] ^ v[a], 32);
      v[c] = (v[c] + v[d]) & MASK_64;
      v[b] = rotr64(v[b] ^ v[c], 24);
      v[a] = (v[a] + v[b] + y) & MASK_64;
      v[d] = rotr64(v[d] ^ v[a], 16);
      v[c] = (v[c] + v[d]) & MASK_64;
      v[b] = rotr64(v[b] ^ v[c], 63);
    };
    for (let round = 0; round < 12; round++) {
      const s = BLAKE2B_SIGMA[round % 10];
      g(0, 4, 8, 12, m[s[0]], m[s[1]]);
      g(1, 5, 9, 13, m[s[2]], m[s[3]]);
      g(2, 6, 10, 14, m[s[4]], m[s[5]]);
      g(3, 7, 11, 15, m[s[6]], m[s[7]]);
      g(0, 5, 10, 15, m[s[8]], m[s[9]]);
      g(1, 6, 11, 12, m[s[10]], m[s[11]]);
      g(2, 7, 8, 13, m[s[12]], m[s[13]]);
      g(3, 4, 9, 14, m[s[14]], m[s[15]]);
    }
    for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
  }

  const out = new Uint8Array(outLength);
  for (let i = 0; i < outLength; i++) {
    out[i] = Number((h[i >> 3] >> BigInt(8 * (i & 7))) & BigInt(0xff));
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let n = ZERO;
  for (const byte of bytes) n = (n << BigInt(8)) | BigInt(byte);
  return n;
}

function base32Encode(value: bigint, chars: number): string {
  let out = "";
  for (let i = chars - 1; i >= 0; i--) {
    out += NANO_ALPHABET[Number((value >> BigInt(5 * i)) & BigInt(31))];
  }
  return out;
}

function base32Decode(text: string): bigint {
  let n = ZERO;
  for (const char of text) n = (n << BigInt(5)) | BigInt(NANO_ALPHABET.indexOf(char));
  return n;
}

function addressChecksum(publicKey: Uint8Array): bigint {
  return bytesToBigInt(blake2b(publicKey, 5).reverse());
}

/** Encode a 32-byte public key (64 hex chars) as a nano_ address. */
export function nanoAccountFromPublicKey(publicKeyHex: string): string {
  if (typeof publicKeyHex !== "string" || !PUBLIC_KEY_RE.test(publicKeyHex)) {
    throw new RangeError("Nano public key must be 64 hex characters");
  }
  const key = hexToBytes(publicKeyHex);
  return `nano_${base32Encode(bytesToBigInt(key), 52)}${base32Encode(addressChecksum(key), 8)}`;
}

/**
 * Decode an address to its upper-case public key hex, or null when the
 * format or the blake2b checksum is wrong (a typo in the address).
 */
export function nanoPublicKeyFromAccount(account: unknown): string | null {
  if (!isNanoAccount(account)) return null;
  const body = normalizeNanoAccount(account).slice(5);
  const keyHex = base32Decode(body.slice(0, 52)).toString(16).padStart(64, "0").toUpperCase();
  return base32Decode(body.slice(52)) === addressChecksum(hexToBytes(keyHex)) ? keyHex : null;
}

/** True only for a well-formed address whose checksum matches. */
export function isValidNanoAccount(value: unknown): value is string {
  return nanoPublicKeyFromAccount(value) !== null;
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
  // Expectations come from our catalog, so a bad checksum there is a
  // registration bug: refuse rather than wait for a payment that never matches.
  if (
    !isValidNanoAccount(expected?.payTo) ||
    typeof expected.amountRaw !== "bigint" ||
    expected.amountRaw <= ZERO ||
    (expected.payer !== undefined && !isValidNanoAccount(expected.payer))
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
