-- ============================================================================
-- 009: Idempotency key TTL purge (follow-up to 008)
-- Additive only. Not applied automatically; apply through the normal migration path.
-- The proxy route already ignores and deletes rows older than 24 h on lookup
-- (src/lib/proxy-billing.ts IDEMPOTENCY_TTL_MS); this function bounds table growth
-- for keys that are never reused. Schedule it with pg_cron where available, e.g.
--   SELECT cron.schedule('bazaar-idempotency-purge', '17 3 * * *',
--     $$SELECT bazaar_purge_idempotency_keys()$$);
-- ============================================================================

CREATE OR REPLACE FUNCTION bazaar_purge_idempotency_keys(p_older_than INTERVAL DEFAULT INTERVAL '24 hours')
RETURNS INTEGER
LANGUAGE sql
AS $$
  WITH purged AS (
    DELETE FROM bazaar_idempotency_keys
     WHERE created_at < NOW() - p_older_than
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM purged;
$$;
