-- 003: Seed BotWall3t as first Bazaar provider
-- Makes the catalog non-empty for demos and testing

-- Insert provider (use a deterministic UUID so this is idempotent)
INSERT INTO bazaar_providers (
  id, name, email, endpoint_url, description,
  api_key_hash, api_key_prefix,
  pricing_model, default_price_cents,
  active, verified
) VALUES (
  'b0771337-b070-4000-a000-000000000001',
  'BotWall3t',
  'ops@noui.bot',
  'https://noui.bot/api/v1',
  'Token-gated API access with agent wallets. Verify on-chain balances, transfer tokens between agents, and gate tool access behind wallet requirements.',
  -- placeholder hash — replace with real key hash when issuing a real key
  'seed_placeholder_not_a_real_key_hash_botwallet',
  'bz_seed...',
  'per_call',
  10, -- $0.10 default
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert tools
INSERT INTO bazaar_tools (
  id, provider_id, tool_name, display_name, description, category,
  price_cents_override, input_schema, active
) VALUES
(
  'b0771337-b070-4000-b001-000000000001',
  'b0771337-b070-4000-a000-000000000001',
  'wallet.balance',
  'Wallet Balance',
  'Check the token balance of an agent wallet. Returns balances across supported chains.',
  'data',
  5, -- $0.05 per call
  '{"type":"object","properties":{"wallet_address":{"type":"string","description":"Wallet address or ENS name"},"chain":{"type":"string","enum":["ethereum","base","solana"],"default":"base"}},"required":["wallet_address"]}'::jsonb,
  true
),
(
  'b0771337-b070-4000-b002-000000000002',
  'b0771337-b070-4000-a000-000000000001',
  'wallet.transfer',
  'Wallet Transfer',
  'Transfer tokens between agent wallets. Requires sender authorization.',
  'comms',
  25, -- $0.25 per call (higher — involves transactions)
  '{"type":"object","properties":{"from":{"type":"string","description":"Sender wallet address"},"to":{"type":"string","description":"Recipient wallet address"},"amount":{"type":"string","description":"Amount in base units"},"token":{"type":"string","default":"USDC"}},"required":["from","to","amount"]}'::jsonb,
  true
),
(
  'b0771337-b070-4000-b003-000000000003',
  'b0771337-b070-4000-a000-000000000001',
  'access.verify',
  'Access Verify',
  'Verify if a wallet meets token-gating requirements for a specific resource. Returns boolean access decision with reason.',
  'other',
  2, -- $0.02 per call (cheap read-only check)
  '{"type":"object","properties":{"wallet_address":{"type":"string","description":"Wallet to verify"},"resource_id":{"type":"string","description":"Resource or tool to check access for"},"min_balance":{"type":"string","description":"Minimum token balance required","default":"0"}},"required":["wallet_address","resource_id"]}'::jsonb,
  true
)
ON CONFLICT (provider_id, tool_name) DO NOTHING;
