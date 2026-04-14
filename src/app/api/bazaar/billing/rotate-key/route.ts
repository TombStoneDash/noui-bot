import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { authenticateKey, generateBazaarKey } from "@/lib/bazaar-auth";
import { createHash } from "crypto";

/**
 * POST /api/bazaar/billing/rotate-key
 *
 * Rotates the current API key: revokes the old key and issues a new one.
 * The new key is returned in the response — it will not be shown again.
 */
export async function POST(request: Request) {
  const owner = await authenticateKey(request);
  if (!owner || owner.type !== "provider") {
    return NextResponse.json(
      { error: true, code: "UNAUTHORIZED", message: "Valid provider API key required" },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const oldApiKey = authHeader?.slice(7) || "";
  const oldHash = createHash("sha256").update(oldApiKey).digest("hex");

  const sb = getSupabase();

  // Revoke the old key
  const { error: revokeErr } = await sb
    .from("bazaar_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("key_hash", oldHash);

  if (revokeErr) {
    return NextResponse.json(
      { error: true, message: "Failed to revoke old key" },
      { status: 500 }
    );
  }

  // Generate a new key
  const { key, hash, prefix } = generateBazaarKey();

  // Find the old key record to clone its settings
  const { data: oldKeyRecord } = await sb
    .from("bazaar_api_keys")
    .select("owner_type, owner_id, rate_limit_rpm, scopes")
    .eq("key_hash", oldHash)
    .single();

  const { error: insertErr } = await sb
    .from("bazaar_api_keys")
    .insert({
      key_hash: hash,
      key_prefix: prefix,
      owner_type: oldKeyRecord?.owner_type || "provider",
      owner_id: oldKeyRecord?.owner_id || owner.id,
      rate_limit_rpm: oldKeyRecord?.rate_limit_rpm || 60,
      scopes: oldKeyRecord?.scopes || null,
      created_at: new Date().toISOString(),
    });

  if (insertErr) {
    return NextResponse.json(
      { error: true, message: "Failed to create new key" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Key rotated successfully. Save the new key — it will not be shown again.",
    new_key: key,
    prefix,
    old_key_revoked: true,
  });
}
