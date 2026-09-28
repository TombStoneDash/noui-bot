import { writeFile } from "node:fs/promises";

// Use the committed development fallback, regardless of the caller's environment.
process.env.RECEIPT_SIGNING_SECRET = "";
const { signReceipt } = await import("../../src/lib/receipts.ts");

const receipt = {
  receipt_id: "rcpt_0123456789abcdef",
  tool_id: "b0771337-b070-4000-b001-000000000001",
  tool_name: "wallet.balance",
  agent_id: "agent_fixture",
  provider_id: "b0771337-b070-4000-a000-000000000001",
  timestamp: "2026-09-21T00:00:00.000Z",
  duration_ms: 42,
  cost_microcents: 500,
  status: "success",
};
const good = {
  ...receipt,
  signature: signReceipt(receipt),
  verify_url: "https://noui.bot/api/v1/bazaar/receipts/rcpt_0123456789abcdef",
};

await writeFile(new URL("receipt.good.json", import.meta.url), `${JSON.stringify(good, null, 2)}\n`);
await writeFile(new URL("receipt.tampered.json", import.meta.url), `${JSON.stringify({ ...good, cost_microcents: 0 }, null, 2)}\n`);
