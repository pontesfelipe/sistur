
CREATE TABLE IF NOT EXISTS public.edu_xp_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('course_completed','step_completed','exam_passed','badge_earned','manual')),
  reference_id UUID,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON public.edu_xp_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.edu_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.edu_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.edu_user_badges(user_id);

ALTER TABLE public.edu_xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_events_select_own" ON public.edu_xp_events
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "xp_events_insert_own" ON public.edu_xp_events
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "badges_select_all" ON public.edu_badges
FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "badges_admin_manage" ON public.edu_badges
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'ADMIN'))
WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

CREATE POLICY "user_badges_select_own" ON public.edu_user_badges
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "user_badges_insert_own" ON public.edu_user_badges
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

INSERT INTO public.edu_badges (code, title, description, icon, criteria, xp_reward) VALUES
('first_course','Primeira Conquista','Concluiu o primeiro curso na plataforma','Trophy','Concluir 1 curso',50),
('path_starter','Trilheiro','Iniciou sua primeira trilha adaptativa','Map','Matricular-se em 1 trilha',25),
('path_finisher','Caminho Completo','Concluiu uma trilha adaptativa','Flag','Concluir 100% das etapas',150),
('exam_ace','Mestre nas Provas','Tirou nota máxima em uma prova','Star','Atingir 100 em uma avaliação',100),
('week_streak','Constância Semanal','Estudou 7 dias seguidos','Flame','Heartbeat AVA por 7 dias',75)
ON CONFLICT (code) DO NOTHING;
