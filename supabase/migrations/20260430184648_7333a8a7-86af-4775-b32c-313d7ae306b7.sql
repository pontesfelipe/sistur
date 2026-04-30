
CREATE TABLE IF NOT EXISTS public.report_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  assessment_id UUID NOT NULL,
  destination_name TEXT NOT NULL,
  report_template TEXT NOT NULL DEFAULT 'completo',
  visibility TEXT NOT NULL DEFAULT 'personal',
  environment TEXT NOT NULL DEFAULT 'production',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
  stage TEXT,
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  error_message TEXT,
  report_id UUID REFERENCES public.generated_reports(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_assessment ON public.report_jobs(assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_jobs_org_status ON public.report_jobs(org_id, status);

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report jobs in their org"
  ON public.report_jobs FOR SELECT
  USING (user_belongs_to_org(auth.uid(), org_id) OR org_id = get_effective_org_id());

CREATE POLICY "Admins/Analysts can create report jobs"
  ON public.report_jobs FOR INSERT
  WITH CHECK (
    user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
  );
