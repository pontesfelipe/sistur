CREATE OR REPLACE FUNCTION public.dispatch_report_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_url text := 'https://enexnpmkhvgufcervjsv.supabase.co/functions/v1/process-report-job';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZXhucG1raHZndWZjZXJ2anN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTYxODUsImV4cCI6MjA4MTM5MjE4NX0.lix1AwQ0zZqkHcU-0FygIiiMQ9GlTR_t8fGpbNoF9Tw';
BEGIN
  IF NEW.status <> 'queued' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon
    ),
    body := jsonb_build_object('jobId', NEW.id::text),
    timeout_milliseconds := 900000
  );

  RETURN NEW;
END;
$function$;

UPDATE public.report_jobs
SET status = 'failed',
    stage = '[trace=repair] Falha liberada para nova tentativa',
    error_message = '[trace=repair] Worker anterior ficou sem resposta antes de finalizar. Tente gerar novamente após a correção do streaming do worker.',
    finished_at = now()
WHERE status = 'processing'
  AND finished_at IS NULL
  AND started_at < now() - interval '8 minutes';