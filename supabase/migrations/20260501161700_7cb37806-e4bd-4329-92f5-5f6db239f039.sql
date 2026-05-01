ALTER TABLE public.report_jobs
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS auth_jwt text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_report_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    body := jsonb_build_object('jobId', NEW.id::text)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_report_job ON public.report_jobs;
CREATE TRIGGER trg_dispatch_report_job
  AFTER INSERT ON public.report_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_report_job();

CREATE OR REPLACE FUNCTION public.requeue_report_job(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.report_jobs
  SET status = 'queued', stage = '[retry] reenfileirado', error_message = NULL, attempts = COALESCE(attempts,0)
  WHERE id = p_job_id AND status IN ('failed', 'processing');
END;
$$;