import { NextResponse } from "next/server";
import { authenticateKey } from "@/lib/bazaar-auth";

/**
 * GET /api/v1/bazaar/balance — Check agent's current balance
 * Requires consumer API key.
 */
export async function GET(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner) {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid API key required (Authorization: Bearer bz_...)" },
      { status: 401 }
    );
  }

  if (owner.type !== "consumer") {
    return NextResponse.json(
      { error: true, code: "FORBIDDEN", message: "Balance is only available for consumer accounts" },
      { status: 403 }
    );
  }

  const balanceCents = owner.balance_cents ?? 0;

  return NextResponse.json({
    agent_id: owner.id,
    name: owner.name,
    balance_cents: balanceCents,
    balance_microcents: balanceCents * 100,
    balance: `$${(balanceCents / 100).toFixed(2)}`,
    rate_limit_rpm: owner.rate_limit_rpm,
    load_balance_url: "POST /api/bazaar/balance/load",
  });
}
