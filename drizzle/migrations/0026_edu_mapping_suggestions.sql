CREATE TABLE public.edu_mapping_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL REFERENCES public.edu_trainings(training_id) ON DELETE CASCADE,
  indicator_code text NOT NULL,
  pillar text NOT NULL,
  confidence integer NOT NULL DEFAULT 0,
  rationale text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_id, indicator_code)
);
CREATE TABLE public.edu_mapping_analysis_log (
  training_id text PRIMARY KEY REFERENCES public.edu_trainings(training_id) ON DELETE CASCADE,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  suggestions_count integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edu_mapping_suggestions TO authenticated;
GRANT ALL ON public.edu_mapping_suggestions TO service_role;
GRANT SELECT ON public.edu_mapping_analysis_log TO authenticated;
GRANT ALL ON public.edu_mapping_analysis_log TO service_role;
ALTER TABLE public.edu_mapping_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_mapping_analysis_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mapping suggestions" ON public.edu_mapping_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins read analysis log" ON public.edu_mapping_analysis_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));