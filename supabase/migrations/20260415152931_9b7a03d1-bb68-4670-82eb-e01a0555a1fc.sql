
-- ============================================
-- FASE 1: Progresso Granular em Treinamentos
-- ============================================

-- Tabela de progresso detalhado por treinamento
CREATE TABLE public.edu_detailed_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id TEXT NOT NULL,
  module_index INTEGER DEFAULT 0,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  video_position_seconds INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id, module_index)
);

ALTER TABLE public.edu_detailed_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.edu_detailed_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.edu_detailed_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.edu_detailed_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all progress" ON public.edu_detailed_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- ============================================
-- FASE 2: Rating de Treinamentos
-- ============================================

CREATE TABLE public.edu_training_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id)
);

ALTER TABLE public.edu_training_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all ratings" ON public.edu_training_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own rating" ON public.edu_training_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rating" ON public.edu_training_ratings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- FASE 2: Notificações EDU
-- ============================================

CREATE TABLE public.edu_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'assignment_due', 'new_content', 'exam_result', 'certificate_issued', 'achievement'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.edu_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.edu_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.edu_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.edu_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- FASE 3: Gamificação (Achievements, XP, Streaks)
-- ============================================

CREATE TABLE public.edu_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_icon TEXT,
  xp_earned INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_code)
);

ALTER TABLE public.edu_user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.edu_user_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" ON public.edu_user_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.edu_user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.edu_user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp" ON public.edu_user_xp
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own xp" ON public.edu_user_xp
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own xp" ON public.edu_user_xp
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- FASE 5: Anotações Pessoais
-- ============================================

CREATE TABLE public.edu_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id TEXT NOT NULL,
  module_index INTEGER DEFAULT 0,
  video_timestamp_seconds INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.edu_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes" ON public.edu_notes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_notifications;
