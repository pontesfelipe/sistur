CREATE TABLE public.report_semantic_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name text,
  applies_to text NOT NULL DEFAULT 'both',
  score integer NOT NULL,
  fails integer NOT NULL DEFAULT 0,
  warns integer NOT NULL DEFAULT 0,
  passes integer NOT NULL DEFAULT 0,
  report_chars integer NOT NULL DEFAULT 0,
  segments integer NOT NULL DEFAULT 1,
  summary text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.report_semantic_audits TO authenticated;
GRANT ALL ON public.report_semantic_audits TO service_role;
ALTER TABLE public.report_semantic_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audits" ON public.report_semantic_audits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins insert audits" ON public.report_semantic_audits FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN') AND created_by = auth.uid());
CREATE POLICY "Admins delete audits" ON public.report_semantic_audits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE INDEX ON public.report_semantic_audits (created_at DESC);