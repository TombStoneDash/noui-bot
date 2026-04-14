-- 005: Add subscription tracking to bazaar_consumers
-- Supports Pro ($29/mo) and Scale ($99/mo) tiers via Stripe

ALTER TABLE bazaar_consumers
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;

-- subscription_plan: 'free' | 'pro' | 'scale'
-- subscription_status: 'none' | 'active' | 'past_due' | 'cancelled' | 'incomplete'

COMMENT ON COLUMN bazaar_consumers.subscription_id IS 'Stripe subscription ID (sub_...)';
COMMENT ON COLUMN bazaar_consumers.subscription_plan IS 'Current plan: free, pro, scale';
COMMENT ON COLUMN bazaar_consumers.subscription_status IS 'Stripe subscription status';
