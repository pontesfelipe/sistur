CREATE OR REPLACE FUNCTION public.get_ingestion_health()
RETURNS TABLE(function_name text, expected_cadence text, last_run_at timestamp with time zone, last_status text, last_records_processed integer, last_records_failed integer, last_error text, age_days numeric, health text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      ('ingest-anatel',       'Mensal',       40::numeric),
      ('ingest-observatory',  'Mensal',       40::numeric)
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
$function$;