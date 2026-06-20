
CREATE TABLE public.project_indicator_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  indicator_id uuid REFERENCES public.indicators(id) ON DELETE SET NULL,
  indicator_code text NOT NULL,
  indicator_name text,
  pillar text,
  baseline_score numeric,
  baseline_status text,
  baseline_captured_at timestamptz NOT NULL DEFAULT now(),
  target_score numeric DEFAULT 0.67,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (project_id, indicator_code)
);

CREATE INDEX idx_pil_project ON public.project_indicator_links(project_id);
CREATE INDEX idx_pil_code ON public.project_indicator_links(indicator_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_indicator_links TO authenticated;
GRANT ALL ON public.project_indicator_links TO service_role;

ALTER TABLE public.project_indicator_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View links of accessible projects"
  ON public.project_indicator_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicator_links.project_id
        AND (
          public.has_role(auth.uid(), 'ADMIN'::app_role)
          OR p.org_id = public.get_effective_org_id()
          OR p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
        )
    )
  );

CREATE POLICY "Manage links of own org projects"
  ON public.project_indicator_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicator_links.project_id
        AND (
          public.has_role(auth.uid(), 'ADMIN'::app_role)
          OR p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_indicator_links.project_id
        AND (
          public.has_role(auth.uid(), 'ADMIN'::app_role)
          OR p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
        )
    )
  );

CREATE TRIGGER trg_pil_updated_at
  BEFORE UPDATE ON public.project_indicator_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
