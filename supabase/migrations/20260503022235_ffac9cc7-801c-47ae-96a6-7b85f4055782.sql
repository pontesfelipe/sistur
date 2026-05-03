
-- Trilhas
CREATE TABLE public.edu_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  pillar TEXT CHECK (pillar IN ('RA','OE','AO')),
  level TEXT CHECK (level IN ('introdutorio','basico','intermediario','avancado')),
  target_audience TEXT[] DEFAULT '{}',
  is_adaptive BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,
  org_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Etapas da trilha
CREATE TABLE public.edu_learning_path_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES public.edu_learning_paths(id) ON DELETE CASCADE,
  training_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  prerequisite_step_id UUID REFERENCES public.edu_learning_path_steps(id) ON DELETE SET NULL,
  min_score NUMERIC DEFAULT 70,
  required_status TEXT CHECK (required_status IN ('atencao','critico','any')) DEFAULT 'any',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matrículas
CREATE TABLE public.edu_learning_path_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES public.edu_learning_paths(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_step_id UUID REFERENCES public.edu_learning_path_steps(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluida','pausada','cancelada')),
  triggered_by TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(path_id, user_id)
);

-- Progresso por etapa
CREATE TABLE public.edu_learning_path_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.edu_learning_path_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.edu_learning_path_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','dispensada')),
  score NUMERIC,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(enrollment_id, step_id)
);

CREATE INDEX idx_lp_steps_path ON public.edu_learning_path_steps(path_id, order_index);
CREATE INDEX idx_lp_enroll_user ON public.edu_learning_path_enrollments(user_id);
CREATE INDEX idx_lp_progress_enroll ON public.edu_learning_path_progress(enrollment_id);

-- updated_at trigger
CREATE TRIGGER trg_lp_updated_at
BEFORE UPDATE ON public.edu_learning_paths
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.edu_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_learning_path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_learning_path_progress ENABLE ROW LEVEL SECURITY;

-- Paths: leitura pública para publicadas (autenticados); autor/admin sempre
CREATE POLICY "lp_select_public" ON public.edu_learning_paths
FOR SELECT TO authenticated
USING (published = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "lp_insert_authors" ON public.edu_learning_paths
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'PROFESSOR')
    OR public.has_role(auth.uid(), 'ORG_ADMIN')
  )
);

CREATE POLICY "lp_update_authors" ON public.edu_learning_paths
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "lp_delete_authors" ON public.edu_learning_paths
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

-- Steps: herdam do path
CREATE POLICY "lp_steps_select" ON public.edu_learning_path_steps
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.edu_learning_paths p
  WHERE p.id = path_id AND (p.published = true OR p.created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
));

CREATE POLICY "lp_steps_manage" ON public.edu_learning_path_steps
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.edu_learning_paths p
  WHERE p.id = path_id AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.edu_learning_paths p
  WHERE p.id = path_id AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
));

-- Enrollments: aluno gerencia suas; autor/admin pode ver todas da trilha
CREATE POLICY "lp_enroll_select" ON public.edu_learning_path_enrollments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'ADMIN')
  OR EXISTS (SELECT 1 FROM public.edu_learning_paths p WHERE p.id = path_id AND p.created_by = auth.uid())
);

CREATE POLICY "lp_enroll_insert" ON public.edu_learning_path_enrollments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "lp_enroll_update" ON public.edu_learning_path_enrollments
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "lp_enroll_delete" ON public.edu_learning_path_enrollments
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

-- Progress: aluno gerencia o seu
CREATE POLICY "lp_prog_select" ON public.edu_learning_path_progress
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.edu_learning_path_enrollments e
  WHERE e.id = enrollment_id AND (
    e.user_id = auth.uid()
    OR public.has_role(auth.uid(), 'ADMIN')
    OR EXISTS (SELECT 1 FROM public.edu_learning_paths p WHERE p.id = e.path_id AND p.created_by = auth.uid())
  )
));

CREATE POLICY "lp_prog_manage" ON public.edu_learning_path_progress
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.edu_learning_path_enrollments e
  WHERE e.id = enrollment_id AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.edu_learning_path_enrollments e
  WHERE e.id = enrollment_id AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
));
