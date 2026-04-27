
-- Tabela de histórico de execuções de ingestão
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'manual'
    CHECK (triggered_by IN ('cron','manual','admin','system')),
  triggered_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','failed','partial')),
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_function_started
  ON public.ingestion_runs (function_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status
  ON public.ingestion_runs (status, started_at DESC);

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ir_admin_read ON public.ingestion_runs;
DROP POLICY IF EXISTS ir_admin_write ON public.ingestion_runs;
DROP POLICY IF EXISTS ir_service_write ON public.ingestion_runs;

CREATE POLICY ir_admin_read ON public.ingestion_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY ir_admin_write ON public.ingestion_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Visão consolidada da saúde das ingestões
CREATE OR REPLACE FUNCTION public.get_ingestion_health()
RETURNS TABLE (
  function_name TEXT,
  expected_cadence TEXT,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_records_processed INTEGER,
  last_records_failed INTEGER,
  last_error TEXT,
  age_days NUMERIC,
  health TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH known(function_name, expected_cadence, max_age_days) AS (
    VALUES
      ('ingest-cadastur',     'Trimestral',  100::numeric),
      ('ingest-mapa-turismo', 'Trimestral',  100::numeric),
      ('ingest-ana',          'Anual',       400::numeric),
      ('ingest-tse',          'Bienal',      800::numeric),
      ('ingest-anatel',       'Mensal',       40::numeric)
  ),
  last_run AS (
    SELECT DISTINCT ON (r.function_name)
      r.function_name, r.started_at, r.status,
      r.records_processed, r.records_failed, r.error_message
    FROM public.ingestion_runs r
    ORDER BY r.function_name, r.started_at DESC
  )
  SELECT
    k.function_name,
    k.expected_cadence,
    lr.started_at,
    lr.status,
    lr.records_processed,
    lr.records_failed,
    lr.error_message,
    CASE WHEN lr.started_at IS NULL THEN NULL
         ELSE ROUND(EXTRACT(EPOCH FROM (now() - lr.started_at))/86400, 1)
    END,
    CASE
      WHEN lr.started_at IS NULL THEN 'never_run'
      WHEN lr.status = 'failed' THEN 'failed'
      WHEN EXTRACT(EPOCH FROM (now() - lr.started_at))/86400 > k.max_age_days THEN 'stale'
      WHEN lr.status = 'partial' THEN 'partial'
      ELSE 'healthy'
    END
  FROM known k
  LEFT JOIN last_run lr ON lr.function_name = k.function_name
  ORDER BY k.function_name;
END;
$$;

-- Lembrete anual MTur
CREATE OR REPLACE FUNCTION public.get_mtur_reference_freshness()
RETURNS TABLE (
  latest_reference_year INTEGER,
  rows_count INTEGER,
  last_updated TIMESTAMPTZ,
  age_days NUMERIC,
  needs_review BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    MAX(reference_year)::INTEGER,
    COUNT(*)::INTEGER,
    MAX(created_at),
    ROUND(EXTRACT(EPOCH FROM (now() - MAX(created_at)))/86400, 1),
    (EXTRACT(YEAR FROM now())::INT - COALESCE(MAX(reference_year), 0)) >= 2
  FROM public.tourism_spending_reference;
END;
$$;
