import { createHash } from "crypto";
import { getSupabase } from "./supabase";

export type KeyOwner = {
  id: string;
  type: "provider" | "consumer";
  name: string;
  email: string;
  active: boolean;
  rate_limit_rpm: number;
  balance_cents?: number;
  endpoint_url?: string;
};

/**
 * Authenticate a Bazaar API key.
 * Returns the owner (provider or consumer) or null.
 */
export async function authenticateKey(request: Request): Promise<KeyOwner | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith("bz_")) return null;

  const hash = createHash("sha256").update(apiKey).digest("hex");
  const sb = getSupabase();

  // Look up the key
  const { data: keyRecord, error } = await sb
    .from("bazaar_api_keys")
    .select("*")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .single();

  if (error || !keyRecord) return null;

  // Check expiry
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) return null;

  // Update last_used_at
  await sb
    .from("bazaar_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  // Fetch the owner
  if (keyRecord.owner_type === "consumer") {
    const { data: consumer } = await sb
      .from("bazaar_consumers")
      .select("*")
      .eq("id", keyRecord.owner_id)
      .single();

    if (!consumer || !consumer.active) return null;

    return {
      id: consumer.id,
      type: "consumer",
      name: consumer.name,
      email: consumer.email,
      active: consumer.active,
      rate_limit_rpm: keyRecord.rate_limit_rpm || consumer.rate_limit_rpm,
      balance_cents: consumer.balance_cents,
    };
  }

  if (keyRecord.owner_type === "provider") {
    const { data: provider } = await sb
      .from("bazaar_providers")
      .select("*")
      .eq("id", keyRecord.owner_id)
      .single();

    if (!provider || !provider.active) return null;

    return {
      id: provider.id,
      type: "provider",
      name: provider.name,
      email: provider.email,
      active: provider.active,
      rate_limit_rpm: keyRecord.rate_limit_rpm || 60,
      endpoint_url: provider.endpoint_url,
    };
  }

  return null;
}

/**
 * Generate a new Bazaar API key.
 */
export function generateBazaarKey(): { key: string; hash: string; prefix: string } {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `bz_${random}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = `bz_${random.slice(0, 8)}...`;
  return { key, hash, prefix };
}
