UPDATE public.report_jobs
SET status = 'failed',
    error_message = COALESCE(error_message, '') ||
      ' [auto-cleanup] Worker excedeu o limite de execução antes de finalizar. Por favor, gere o relatório novamente.',
    finished_at = now()
WHERE status = 'processing'
  AND last_attempt_at < now() - interval '15 minutes';