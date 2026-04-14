-- =====================================================================
-- Schedule nightly expiry of trial licenses via pg_cron.
--
-- The `expire_trial_licenses()` function was introduced in
-- 20260325040724_*.sql, but nothing was flipping stale trials to the
-- 'expired' status — the client relied on `is_valid` flags from
-- `get_license_status()` at read time, which meant the `licenses.status`
-- column drifted out of sync with reality. That made admin tooling,
-- analytics queries, and any RLS policy that joins on
-- `licenses.status = 'active'` show misleading results.
--
-- This migration ensures pg_cron is available and schedules the
-- expiry sweep to run every day at 03:15 UTC. The job is idempotent
-- because the underlying UPDATE is a no-op when no trials are due.
-- =====================================================================

-- Make sure pg_cron is installed. In Supabase this is pre-installed but
-- may not be enabled on self-hosted clones.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;

-- Remove any previous version of this job so re-running the migration is
-- safe (cron.schedule() would otherwise error on duplicate job names).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'expire-trial-licenses-daily'
  ) THEN
    PERFORM cron.unschedule('expire-trial-licenses-daily');
  END IF;
END $$;

-- Daily at 03:15 UTC (off-peak for both BR/LATAM and EMEA).
SELECT cron.schedule(
  'expire-trial-licenses-daily',
  '15 3 * * *',
  $$SELECT public.expire_trial_licenses();$$
);

COMMENT ON FUNCTION public.expire_trial_licenses IS
  'Marks trials as expired once trial_ends_at has passed. Scheduled nightly by the "expire-trial-licenses-daily" pg_cron job.';
