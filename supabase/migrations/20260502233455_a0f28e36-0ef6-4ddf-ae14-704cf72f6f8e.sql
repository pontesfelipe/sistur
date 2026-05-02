-- Housekeeping para report_jobs travados
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_stuck_report_jobs()
RETURNS TABLE(cleaned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.report_jobs
    SET status = 'failed',
        error_message = COALESCE(error_message, '') ||
          ' [auto-cleanup] Worker excedeu o limite de execução antes de finalizar. Por favor, gere o relatório novamente.',
        finished_at = now()
    WHERE status = 'processing'
      AND last_attempt_at < now() - interval '15 minutes'
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM updated;

  RETURN QUERY SELECT v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_stuck_report_jobs() FROM PUBLIC, anon, authenticated;

-- Remove agendamento anterior (idempotência) e reagenda a cada 5 minutos
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'cleanup-stuck-report-jobs';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END
$$;

SELECT cron.schedule(
  'cleanup-stuck-report-jobs',
  '*/5 * * * *',
  $$ SELECT public.cleanup_stuck_report_jobs(); $$
);