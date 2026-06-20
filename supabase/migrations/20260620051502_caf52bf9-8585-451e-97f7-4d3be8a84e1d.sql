
-- 1) RACI per task
CREATE TABLE public.project_task_raci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  role text NOT NULL CHECK (role IN ('responsible','accountable','consulted','informed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (task_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_raci TO authenticated;
GRANT ALL ON public.project_task_raci TO service_role;
ALTER TABLE public.project_task_raci ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RACI: org members manage"
ON public.project_task_raci FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_task_raci.project_id
      AND p.org_id = public.get_effective_org_id()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_task_raci.project_id
      AND p.org_id = public.get_effective_org_id()
  )
);

-- 2) Checkpoints (mandatory governance gates)
CREATE TABLE public.project_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  pillar text CHECK (pillar IN ('RA','OE','AO','GERAL')),
  is_mandatory boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  evidence_url text,
  evidence_notes text,
  submitted_by uuid,
  submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  due_date date,
  checkpoint_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_checkpoints TO authenticated;
GRANT ALL ON public.project_checkpoints TO service_role;
ALTER TABLE public.project_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkpoints: org members manage"
ON public.project_checkpoints FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_checkpoints.project_id
      AND p.org_id = public.get_effective_org_id()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_checkpoints.project_id
      AND p.org_id = public.get_effective_org_id()
  )
);

CREATE TRIGGER trg_project_checkpoints_updated_at
BEFORE UPDATE ON public.project_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) EDU enrollments tied to projects/tasks
CREATE TABLE public.project_edu_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  indicator_code text,
  course_id uuid,
  course_title text NOT NULL,
  target_audience text,
  user_id uuid,
  user_name text,
  enrollment_status text NOT NULL DEFAULT 'suggested' CHECK (enrollment_status IN ('suggested','enrolled','in_progress','completed','waived')),
  is_mandatory boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  certificate_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_edu_enrollments TO authenticated;
GRANT ALL ON public.project_edu_enrollments TO service_role;
ALTER TABLE public.project_edu_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ProjectEdu: org members manage"
ON public.project_edu_enrollments FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_edu_enrollments.project_id
      AND p.org_id = public.get_effective_org_id()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_edu_enrollments.project_id
      AND p.org_id = public.get_effective_org_id()
  )
);

CREATE TRIGGER trg_project_edu_enrollments_updated_at
BEFORE UPDATE ON public.project_edu_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_raci_task ON public.project_task_raci(task_id);
CREATE INDEX idx_checkpoints_project ON public.project_checkpoints(project_id);
CREATE INDEX idx_project_edu_project ON public.project_edu_enrollments(project_id);
