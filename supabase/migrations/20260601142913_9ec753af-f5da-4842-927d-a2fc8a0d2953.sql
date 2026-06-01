-- 1) Table
CREATE TABLE IF NOT EXISTS public.assessment_calc_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  org_id UUID,
  requested_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  error_message TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calc_jobs_assessment ON public.assessment_calc_jobs(assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_jobs_status ON public.assessment_calc_jobs(status) WHERE status IN ('pending','running');

-- 2) Grants
GRANT SELECT ON public.assessment_calc_jobs TO authenticated;
GRANT ALL ON public.assessment_calc_jobs TO service_role;

-- 3) RLS
ALTER TABLE public.assessment_calc_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view jobs from their org or as admin"
ON public.assessment_calc_jobs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN') OR
  public.user_belongs_to_org(auth.uid(), org_id)
);

-- 4) Updated-at trigger
CREATE TRIGGER trg_assessment_calc_jobs_updated_at
BEFORE UPDATE ON public.assessment_calc_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Watchdog: auto-fail stuck jobs older than 10 minutes
CREATE OR REPLACE FUNCTION public.expire_stuck_calc_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.assessment_calc_jobs
     SET status = 'failed',
         error_message = COALESCE(error_message, 'Tempo limite excedido (10 min sem resposta do motor)'),
         finished_at = now()
   WHERE status IN ('pending','running')
     AND created_at < now() - interval '10 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stuck_calc_jobs() TO authenticated, service_role;