import assert from "node:assert/strict";
import test from "node:test";

process.env.RECEIPT_SIGNING_SECRET = "";
const { requireSigningSecret, signingSecretConfigured, signReceipt } = await import("../src/lib/receipts.ts");

function withEnv(values, fn) {
  const saved = {};
  for (const [key, value] of Object.entries(values)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production + enforce on + no secret -> throws receipt_signing_unconfigured", () => {
  withEnv({ NODE_ENV: "production", RECEIPT_SIGNING_ENFORCE: "true", RECEIPT_SIGNING_SECRET: "" }, () => {
    assert.equal(signingSecretConfigured(), false);
    assert.throws(() => requireSigningSecret(), { message: "receipt_signing_unconfigured" });
  });
});

test("production + RECEIPT_SIGNING_ENFORCE=false + no secret -> proceeds", () => {
  withEnv({ NODE_ENV: "production", RECEIPT_SIGNING_ENFORCE: "false", RECEIPT_SIGNING_SECRET: undefined }, () => {
    assert.doesNotThrow(() => requireSigningSecret());
  });
});

test("production + enforce unset + no secret -> proceeds (enforcement is opt-in until prod has the secret)", () => {
  withEnv({ NODE_ENV: "production", RECEIPT_SIGNING_ENFORCE: undefined, RECEIPT_SIGNING_SECRET: undefined }, () => {
    assert.doesNotThrow(() => requireSigningSecret());
  });
});

test("production + enforce on + secret present -> proceeds", () => {
  withEnv({ NODE_ENV: "production", RECEIPT_SIGNING_ENFORCE: "true", RECEIPT_SIGNING_SECRET: "test-only-secret" }, () => {
    assert.equal(signingSecretConfigured(), true);
    assert.doesNotThrow(() => requireSigningSecret());
  });
});

test("dev/test without the secret keep the committed fallback signer", () => {
  withEnv({ NODE_ENV: "test", RECEIPT_SIGNING_ENFORCE: "true", RECEIPT_SIGNING_SECRET: "" }, () => {
    assert.doesNotThrow(() => requireSigningSecret());
    const sig = signReceipt({
      receipt_id: "rcpt_0123456789abcdef", tool_id: "t", agent_id: "a", provider_id: "p",
      timestamp: "2026-09-21T00:00:00.000Z", cost_microcents: 500, status: "success",
    });
    assert.match(sig, /^[0-9a-f]{64}$/);
  });
});
