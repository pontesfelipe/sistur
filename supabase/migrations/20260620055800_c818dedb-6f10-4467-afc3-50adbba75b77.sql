
-- ============ project_budget_lines ============
CREATE TABLE public.project_budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  planned_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  funding_source TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_budget_lines TO authenticated;
GRANT ALL ON public.project_budget_lines TO service_role;

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage budget lines"
ON public.project_budget_lines FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_budget_lines.project_id
      AND (
        public.has_role(auth.uid(), 'ADMIN')
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = auth.uid() AND pr.org_id = p.org_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_budget_lines.project_id
      AND (
        public.has_role(auth.uid(), 'ADMIN')
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = auth.uid() AND pr.org_id = p.org_id
        )
      )
  )
);

CREATE INDEX idx_pbl_project ON public.project_budget_lines(project_id);
CREATE INDEX idx_pbl_phase ON public.project_budget_lines(phase_id);

CREATE TRIGGER update_pbl_updated_at
BEFORE UPDATE ON public.project_budget_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ project_external_links ============
CREATE TABLE public.project_external_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('investment_opportunity','consortium','observatory_alert','issue')),
  external_id UUID NOT NULL,
  label TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, link_type, external_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_external_links TO authenticated;
GRANT ALL ON public.project_external_links TO service_role;

ALTER TABLE public.project_external_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage external links"
ON public.project_external_links FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_external_links.project_id
      AND (
        public.has_role(auth.uid(), 'ADMIN')
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = auth.uid() AND pr.org_id = p.org_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_external_links.project_id
      AND (
        public.has_role(auth.uid(), 'ADMIN')
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = auth.uid() AND pr.org_id = p.org_id
        )
      )
  )
);

CREATE INDEX idx_pel_project ON public.project_external_links(project_id);
CREATE INDEX idx_pel_external ON public.project_external_links(link_type, external_id);

CREATE TRIGGER update_pel_updated_at
BEFORE UPDATE ON public.project_external_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
