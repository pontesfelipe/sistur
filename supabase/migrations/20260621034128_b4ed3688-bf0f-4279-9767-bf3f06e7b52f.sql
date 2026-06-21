
CREATE TABLE public.enterprise_pms_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('opera','cloudbeds','stays','csv_generic')),
  period_start DATE,
  period_end DATE,
  raw_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  parsed_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed','applied','failed','rejected')),
  error_message TEXT,
  rows_count INTEGER NOT NULL DEFAULT 0,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_pms_imports TO authenticated;
GRANT ALL ON public.enterprise_pms_imports TO service_role;

ALTER TABLE public.enterprise_pms_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PMS imports: members read own org"
  ON public.enterprise_pms_imports FOR SELECT
  TO authenticated
  USING (org_id = public.get_effective_org_id());

CREATE POLICY "PMS imports: members insert own org"
  ON public.enterprise_pms_imports FOR INSERT
  TO authenticated
  WITH CHECK (org_id = public.get_effective_org_id() AND imported_by = auth.uid());

CREATE POLICY "PMS imports: members update own org"
  ON public.enterprise_pms_imports FOR UPDATE
  TO authenticated
  USING (org_id = public.get_effective_org_id())
  WITH CHECK (org_id = public.get_effective_org_id());

CREATE POLICY "PMS imports: admins delete own org"
  ON public.enterprise_pms_imports FOR DELETE
  TO authenticated
  USING (
    org_id = public.get_effective_org_id()
    AND (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ORG_ADMIN'))
  );

CREATE INDEX idx_enterprise_pms_imports_org ON public.enterprise_pms_imports(org_id);
CREATE INDEX idx_enterprise_pms_imports_assessment ON public.enterprise_pms_imports(assessment_id);
CREATE INDEX idx_enterprise_pms_imports_imported_at ON public.enterprise_pms_imports(imported_at DESC);

CREATE TRIGGER update_enterprise_pms_imports_updated_at
  BEFORE UPDATE ON public.enterprise_pms_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
