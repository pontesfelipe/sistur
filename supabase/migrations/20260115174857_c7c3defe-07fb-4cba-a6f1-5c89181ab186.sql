-- ==========================================
-- SISTUR EDU LMS - SPRINT 1: ENROLLMENTS & PROGRESS
-- Schema 3: Enrollment, Lesson Progress
-- ==========================================

CREATE TYPE public.enrollment_status_type AS ENUM ('active', 'completed', 'dropped', 'suspended');
CREATE TYPE public.lesson_progress_status AS ENUM ('not_started', 'in_progress', 'completed');

-- ==========================================
-- ENROLLMENTS
-- ==========================================

CREATE TABLE public.lms_enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL DEFAULT 1,
  status enrollment_status_type NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  progress_pct DECIMAL(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_lms_enrollments_user ON public.lms_enrollments(user_id);
CREATE INDEX idx_lms_enrollments_course ON public.lms_enrollments(course_id);
CREATE INDEX idx_lms_enrollments_status ON public.lms_enrollments(status);

-- ==========================================
-- LESSON PROGRESS
-- ==========================================

CREATE TABLE public.lms_lesson_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lms_lessons(lesson_id) ON DELETE CASCADE,
  status lesson_progress_status NOT NULL DEFAULT 'not_started',
  progress_pct DECIMAL(5,2) DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_lms_lesson_progress_user ON public.lms_lesson_progress(user_id);
CREATE INDEX idx_lms_lesson_progress_lesson ON public.lms_lesson_progress(lesson_id);

-- ==========================================
-- QUIZ QUESTIONS (Bank)
-- ==========================================

CREATE TYPE public.quiz_origin_type AS ENUM ('existing', 'generated', 'imported');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');

CREATE TABLE public.quiz_questions (
  quiz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin quiz_origin_type NOT NULL DEFAULT 'existing',
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  theme TEXT,
  question_type question_type NOT NULL DEFAULT 'multiple_choice',
  stem TEXT NOT NULL,
  explanation TEXT,
  difficulty DECIMAL(3,2) CHECK (difficulty BETWEEN 0 AND 1),
  discrimination_index DECIMAL(3,2),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  validated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_pillar ON public.quiz_questions(pillar);
CREATE INDEX idx_quiz_questions_level ON public.quiz_questions(level);
CREATE INDEX idx_quiz_questions_active ON public.quiz_questions(is_active);
CREATE INDEX idx_quiz_questions_origin ON public.quiz_questions(origin);

-- ==========================================
-- QUIZ OPTIONS (Answers)
-- ==========================================

CREATE TABLE public.quiz_options (
  option_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quiz_questions(quiz_id) ON DELETE CASCADE,
  option_label TEXT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_options_quiz ON public.quiz_options(quiz_id);

-- Ensure only one correct answer per question
CREATE UNIQUE INDEX idx_quiz_options_correct ON public.quiz_options(quiz_id)
  WHERE is_correct = true;

-- ==========================================
-- QUIZ → CONTENT SOURCES (Audit Trail)
-- ==========================================

CREATE TABLE public.quiz_content_sources (
  quiz_id UUID REFERENCES public.quiz_questions(quiz_id) ON DELETE CASCADE,
  content_id TEXT REFERENCES public.content_items(content_id) ON DELETE RESTRICT,
  source_locator TEXT NOT NULL,
  PRIMARY KEY (quiz_id, content_id, source_locator)
);

-- ==========================================
-- QUIZ USAGE HISTORY (Anti-Repetition)
-- ==========================================

CREATE TABLE public.quiz_usage_history (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quiz_questions(quiz_id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ NOT NULL,
  times_used INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, quiz_id)
);

CREATE INDEX idx_quiz_usage_user ON public.quiz_usage_history(user_id);
CREATE INDEX idx_quiz_usage_quiz ON public.quiz_usage_history(quiz_id);
CREATE INDEX idx_quiz_usage_last_used ON public.quiz_usage_history(last_used_at);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_usage_history ENABLE ROW LEVEL SECURITY;

-- Enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.lms_enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own enrollments"
  ON public.lms_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollments"
  ON public.lms_enrollments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all enrollments"
  ON public.lms_enrollments FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Lesson Progress
CREATE POLICY "Users can view their own progress"
  ON public.lms_lesson_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own progress"
  ON public.lms_lesson_progress FOR ALL
  USING (user_id = auth.uid());

-- Quiz Questions
CREATE POLICY "Anyone can view active quizzes"
  ON public.quiz_questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage quizzes"
  ON public.quiz_questions FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Quiz Options
CREATE POLICY "Anyone can view quiz options"
  ON public.quiz_options FOR SELECT
  USING (quiz_id IN (SELECT quiz_id FROM public.quiz_questions WHERE is_active = true));

CREATE POLICY "Admins can manage quiz options"
  ON public.quiz_options FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Quiz Content Sources
CREATE POLICY "Anyone can view quiz content sources"
  ON public.quiz_content_sources FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage quiz content sources"
  ON public.quiz_content_sources FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Quiz Usage History
CREATE POLICY "Users can view their own quiz history"
  ON public.quiz_usage_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own quiz history"
  ON public.quiz_usage_history FOR ALL
  USING (user_id = auth.uid());