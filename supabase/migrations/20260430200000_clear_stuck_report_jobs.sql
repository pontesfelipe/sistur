-- v1.38.33 — Limpa jobs de relatório travados em queued/processing antes da correção
-- do recovery de stream timeout. Marca como failed para liberar a UI.
UPDATE public.report_jobs
SET status = 'failed',
    error_message = COALESCE(error_message, 'Stream idle timeout — corrigido na v1.38.33, gere novamente'),
    finished_at = COALESCE(finished_at, now())
WHERE status IN ('queued','processing')
  AND created_at < now();
