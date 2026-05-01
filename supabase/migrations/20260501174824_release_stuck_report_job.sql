-- v1.38.57 — Libera o job travado por causa do 404 no process-report-job
-- (worker não estava deployado; bump da função força redeploy).
UPDATE public.report_jobs
SET status = 'failed',
    error_message = 'Worker process-report-job indisponível (404) na infra de edge functions. Liberado pela migration v1.38.57. Reenvie a geração — o redeploy desta versão restaura o pipeline assíncrono.',
    finished_at = NOW()
WHERE status = 'processing'
  AND finished_at IS NULL
  AND started_at < NOW() - INTERVAL '5 minutes';
