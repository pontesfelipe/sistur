CREATE TABLE public.twin_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  name text NOT NULL,
  preset text NOT NULL DEFAULT 'Base',
  years int NOT NULL DEFAULT 3,
  intensities jsonb NOT NULL DEFAULT '{}'::jsonb,
  projection jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_scenarios TO authenticated;
GRANT ALL ON public.twin_scenarios TO service_role;
ALTER TABLE public.twin_scenarios ENABLE ROW LEVEL SECURITY;
CREATE INDEX twin_scenarios_assessment_idx ON public.twin_scenarios(assessment_id);
CREATE POLICY "twin_scenarios org read" ON public.twin_scenarios FOR SELECT TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "twin_scenarios org insert" ON public.twin_scenarios FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_effective_org_id() AND created_by = auth.uid());
CREATE POLICY "twin_scenarios owner delete" ON public.twin_scenarios FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));