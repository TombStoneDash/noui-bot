import assert from "node:assert/strict";
import test from "node:test";

const {
  RAW_PER_XNO, isNanoAccount, normalizeNanoAccount, xnoToRaw, rawToXno,
  verifyNanoSendBlock, fetchNanoBlockInfo,
  blake2b, nanoAccountFromPublicKey, nanoPublicKeyFromAccount, isValidNanoAccount,
} = await import("../src/lib/nano-settlement.ts");

const PROVIDER = nanoAccountFromPublicKey("A".repeat(64));
const OTHER = nanoAccountFromPublicKey("B".repeat(64));
const PAYER = nanoAccountFromPublicKey("C".repeat(64));

// Well-known mainnet addresses: the genesis account and the burn address.
const GENESIS_KEY = "E89208DD038FBB269987689621D52292AE9C35941A7484756ECCED92A65093BA";
const GENESIS = "nano_3t6k35gi95xu6tergt6p69ck76ogmitsa8mnijtpxm9fkcm736xtoncuohr3";
const BURN = "nano_1111111111111111111111111111111111111111111111111111hifc8npp";

/** Swap one character for another alphabet character (a one-character typo). */
function typo(account, index) {
  const alphabet = "13456789abcdefghijkmnopqrstuwxyz";
  const next = alphabet[(alphabet.indexOf(account[index]) + 1) % alphabet.length];
  return account.slice(0, index) + next + account.slice(index + 1);
}
const HASH = "a".repeat(64);
const COST = xnoToRaw("0.0001");

function blockInfo(overrides = {}, contentOverrides = {}) {
  return {
    block_account: PAYER,
    amount: COST.toString(),
    balance: "5000000000000000000000000000000",
    height: "58",
    confirmed: "true",
    subtype: "send",
    contents: {
      type: "state",
      account: PAYER,
      previous: "B".repeat(64),
      representative: OTHER,
      balance: "5000000000000000000000000000000",
      link: "C".repeat(64),
      link_as_account: PROVIDER,
      ...contentOverrides,
    },
    ...overrides,
  };
}

const expected = { payTo: PROVIDER, amountRaw: COST };

test("xnoToRaw converts decimal XNO exactly", () => {
  assert.equal(xnoToRaw("1"), RAW_PER_XNO);
  assert.equal(xnoToRaw("0.0001"), 10n ** 26n);
  assert.equal(xnoToRaw("0.000001"), 10n ** 24n);
  assert.equal(xnoToRaw("0." + "0".repeat(29) + "1"), 1n);
  assert.equal(xnoToRaw("133248297.920938463463374607431768211455"), 133248297920938463463374607431768211455n);
});

test("xnoToRaw rejects malformed and over-precise input", () => {
  for (const bad of ["", "-1", "1e-4", ".5", "1.", "01", "0x10", " 1", "0." + "0".repeat(30) + "1", 0.1]) {
    assert.throws(() => xnoToRaw(bad), RangeError, String(bad));
  }
});

test("rawToXno round-trips and trims trailing zeros", () => {
  for (const xno of ["0", "1", "0.0001", "12.5", "0." + "0".repeat(29) + "1"]) {
    assert.equal(rawToXno(xnoToRaw(xno)), xno);
  }
  assert.throws(() => rawToXno(-1n), RangeError);
  assert.throws(() => rawToXno(1), RangeError);
});

test("account format check and legacy prefix normalisation", () => {
  assert.equal(isNanoAccount(PROVIDER), true);
  assert.equal(isNanoAccount(PROVIDER.replace("nano_", "xrb_")), true);
  assert.equal(isNanoAccount(`nano_2${"a".repeat(59)}`), false, "must start with 1 or 3");
  assert.equal(isNanoAccount(`nano_1${"a".repeat(58)}l`), false, "l is not in the alphabet");
  assert.equal(isNanoAccount(`nano_1${"a".repeat(58)}`), false, "too short");
  assert.equal(isNanoAccount(null), false);
  assert.equal(normalizeNanoAccount(PROVIDER.replace("nano_", "xrb_")), PROVIDER);
});

test("blake2b matches node's blake2b512 across block boundaries", async () => {
  const { createHash } = await import("node:crypto");
  for (const length of [0, 1, 32, 127, 128, 129, 256, 300]) {
    const input = Uint8Array.from({ length }, (_, i) => (i * 7 + 3) & 0xff);
    assert.equal(
      Buffer.from(blake2b(input, 64)).toString("hex"),
      createHash("blake2b512").update(input).digest("hex"),
      `length ${length}`,
    );
  }
  assert.throws(() => blake2b(new Uint8Array(), 0), RangeError);
  assert.throws(() => blake2b(new Uint8Array(), 65), RangeError);
});

test("addresses encode and decode against known mainnet accounts", () => {
  assert.equal(nanoAccountFromPublicKey(GENESIS_KEY), GENESIS);
  assert.equal(nanoAccountFromPublicKey(GENESIS_KEY.toLowerCase()), GENESIS);
  assert.equal(nanoAccountFromPublicKey("0".repeat(64)), BURN);
  assert.equal(nanoPublicKeyFromAccount(GENESIS), GENESIS_KEY);
  assert.equal(nanoPublicKeyFromAccount(GENESIS.replace("nano_", "xrb_")), GENESIS_KEY);
  assert.equal(nanoPublicKeyFromAccount(BURN), "0".repeat(64));
  for (const bad of ["", "zz", "A".repeat(63), "G".repeat(64), null]) {
    assert.throws(() => nanoAccountFromPublicKey(bad), RangeError, String(bad));
  }
});

test("isValidNanoAccount rejects any one-character typo", () => {
  assert.equal(isValidNanoAccount(GENESIS), true);
  assert.equal(isValidNanoAccount(PROVIDER), true);
  assert.equal(isNanoAccount(`nano_1${"a".repeat(59)}`), true, "format-valid");
  assert.equal(isValidNanoAccount(`nano_1${"a".repeat(59)}`), false, "but checksum-invalid");
  // Every position after the leading pad character, in the key and the checksum.
  for (let i = 6; i < GENESIS.length; i++) {
    assert.equal(isValidNanoAccount(typo(GENESIS, i)), false, `typo at ${i}`);
  }
  for (const bad of [null, 42, "", GENESIS.toUpperCase(), GENESIS.slice(0, -1)]) {
    assert.equal(isValidNanoAccount(bad), false, String(bad));
    assert.equal(nanoPublicKeyFromAccount(bad), null, String(bad));
  }
});

test("a confirmed exact send to the provider is valid", () => {
  const out = verifyNanoSendBlock(HASH, blockInfo(), expected);
  assert.deepEqual(out, {
    valid: true, reason: "ok", hash: HASH.toUpperCase(),
    payer: PAYER, recipient: PROVIDER, amountRaw: COST.toString(),
  });
});

test("legacy xrb_ addresses on either side still match", () => {
  const out = verifyNanoSendBlock(HASH, blockInfo({}, { link_as_account: PROVIDER.replace("nano_", "xrb_") }), {
    ...expected, payTo: PROVIDER, payer: PAYER.replace("nano_", "xrb_"),
  });
  assert.equal(out.reason, "ok");
});

test("confirmed may be a boolean", () => {
  assert.equal(verifyNanoSendBlock(HASH, blockInfo({ confirmed: true }), expected).valid, true);
});

for (const [name, info, reason] of [
  ["unconfirmed block", blockInfo({ confirmed: "false" }), "unconfirmed"],
  ["missing confirmed flag", blockInfo({ confirmed: undefined }), "unconfirmed"],
  ["receive block", blockInfo({ subtype: "receive" }), "not_send"],
  ["change block", blockInfo({ subtype: "change" }), "not_send"],
  ["legacy send block", blockInfo({}, { type: "send" }), "not_state_block"],
  ["paid to someone else", blockInfo({}, { link_as_account: OTHER }), "wrong_recipient"],
  ["underpaid by 1 raw", blockInfo({ amount: (COST - 1n).toString() }), "wrong_amount"],
  ["overpaid by 1 raw", blockInfo({ amount: (COST + 1n).toString() }), "wrong_amount"],
  ["float amount", blockInfo({ amount: "1e26" }), "malformed_block"],
  ["numeric amount", blockInfo({ amount: 1e26 }), "malformed_block"],
  ["negative amount", blockInfo({ amount: "-1" }), "malformed_block"],
  ["missing recipient", blockInfo({}, { link_as_account: undefined }), "malformed_block"],
  ["missing contents", { ...blockInfo(), contents: undefined }, "malformed_block"],
  ["null body", null, "malformed_block"],
  ["array body", [blockInfo()], "malformed_block"],
]) {
  test(`rejects: ${name}`, () => {
    const out = verifyNanoSendBlock(HASH, info, expected);
    assert.equal(out.valid, false);
    assert.equal(out.reason, reason);
  });
}

test("rejects a block from an unexpected payer when payer is pinned", () => {
  assert.equal(verifyNanoSendBlock(HASH, blockInfo(), { ...expected, payer: OTHER }).reason, "wrong_payer");
  assert.equal(verifyNanoSendBlock(HASH, blockInfo(), { ...expected, payer: PAYER }).reason, "ok");
});

test("rejects bad hashes before looking at the block", () => {
  for (const bad of ["", "a".repeat(63), "g".repeat(64), null, 42]) {
    assert.equal(verifyNanoSendBlock(bad, blockInfo(), expected).reason, "bad_hash");
  }
});

test("rejects unusable expectations instead of passing everything", () => {
  for (const bad of [
    { payTo: "not-an-account", amountRaw: COST },
    { payTo: PROVIDER, amountRaw: 0n },
    { payTo: PROVIDER, amountRaw: -1n },
    { payTo: PROVIDER, amountRaw: 100 },
    { payTo: PROVIDER, amountRaw: COST, payer: "nope" },
    { payTo: typo(PROVIDER, 20), amountRaw: COST },
    { payTo: PROVIDER, amountRaw: COST, payer: typo(PAYER, 61) },
    undefined,
  ]) {
    assert.equal(verifyNanoSendBlock(HASH, blockInfo(), bad).reason, "bad_expectation");
  }
});

function stubFetch(response, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return {
      ok: response.status === undefined || response.status < 400,
      status: response.status ?? 200,
      json: async () => response.body,
    };
  };
}

test("fetchNanoBlockInfo posts block_info with json_block and returns the body", async () => {
  const calls = [];
  const body = blockInfo();
  const out = await fetchNanoBlockInfo("https://rpc.example/", HASH, { fetch: stubFetch({ body }, calls) });
  assert.deepEqual(out, body);
  assert.equal(calls[0].url, "https://rpc.example/");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { action: "block_info", json_block: "true", hash: HASH.toUpperCase() });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test("fetchNanoBlockInfo returns null for an unknown block", async () => {
  assert.equal(await fetchNanoBlockInfo("https://rpc.example/", HASH, { fetch: stubFetch({ body: { error: "Block not found" } }) }), null);
});

test("fetchNanoBlockInfo throws on RPC, HTTP and shape errors", async () => {
  const url = "https://rpc.example/";
  await assert.rejects(fetchNanoBlockInfo(url, HASH, { fetch: stubFetch({ body: { error: "Bad hash number" } }) }), /Nano RPC error: Bad hash number/);
  await assert.rejects(fetchNanoBlockInfo(url, HASH, { fetch: stubFetch({ status: 502, body: {} }) }), /HTTP 502/);
  await assert.rejects(fetchNanoBlockInfo(url, HASH, { fetch: stubFetch({ body: [] }) }), /non-object/);
  await assert.rejects(fetchNanoBlockInfo(url, HASH, { fetch: stubFetch(new Error("ECONNRESET")) }), /ECONNRESET/);
  await assert.rejects(fetchNanoBlockInfo(url, "zz", { fetch: stubFetch({ body: {} }) }), RangeError);
});

test("nothing in the request path imports the Nano rail yet", async () => {
  // Adopting the rail is a product decision (issue #12); wiring it in should
  // be a deliberate change that also updates this test.
  const { spawnSync } = await import("node:child_process");
  const grep = spawnSync("grep", ["-rl", "nano-settlement", "src/app", "src/middleware.ts"], { encoding: "utf8" });
  assert.equal(grep.status, 1, `unexpected importers:\n${grep.stdout}`);
});
