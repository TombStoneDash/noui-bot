import { NextResponse } from "next/server";
import { verifyReceiptEnvelope } from "@/lib/receipt-verify";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: true, code: "BAD_REQUEST" },
      { status: 400, headers: HEADERS }
    );
  }

  const receipt = body !== null && typeof body === "object" && !Array.isArray(body) && "receipt" in body
    ? body.receipt
    : body;
  return NextResponse.json(
    { receipt, verification: verifyReceiptEnvelope(receipt) },
    { headers: HEADERS }
  );
}
