CREATE TABLE IF NOT EXISTS public.report_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.generated_reports(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL,
  org_id UUID,
  status TEXT NOT NULL CHECK (status IN ('clean','warnings','auto_corrected','blocked')),
  deterministic_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_corrections JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_issues INT NOT NULL DEFAULT 0,
  validator_version TEXT NOT NULL DEFAULT 'v1.38.8',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_validations_assessment ON public.report_validations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_report_validations_org ON public.report_validations(org_id);
CREATE INDEX IF NOT EXISTS idx_report_validations_created ON public.report_validations(created_at DESC);

ALTER TABLE public.report_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all validations"
  ON public.report_validations FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Org admins read own validations"
  ON public.report_validations FOR SELECT
  USING (
    org_id IS NOT NULL
    AND public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
  );

CREATE POLICY "Service role manages validations"
  ON public.report_validations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');