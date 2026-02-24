import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Get the Stripe client. Returns null if STRIPE_SECRET_KEY is not set.
 * This lazy init avoids build-time errors when the key isn't configured.
 */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const STRIPE_CONNECT_WEBHOOK_SECRET =
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET || "";

/** Platform fee rate charged to providers (18%) */
export const PLATFORM_FEE_RATE = 0.18;
