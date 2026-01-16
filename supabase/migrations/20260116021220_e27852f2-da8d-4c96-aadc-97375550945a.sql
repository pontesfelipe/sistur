-- Create missing tables: certificates, questionnaires, questionnaire_questions, questionnaire_responses

-- 1. CERTIFICATES (Persistent with verification)
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  track_id UUID REFERENCES public.edu_tracks(id),
  course_id UUID REFERENCES public.lms_courses(course_id),
  training_id TEXT,
  exam_id UUID REFERENCES public.exams(exam_id),
  certificate_type TEXT NOT NULL DEFAULT 'track_completion' CHECK (certificate_type IN ('track_completion', 'course_completion', 'exam_passed', 'achievement')),
  title TEXT NOT NULL,
  description TEXT,
  verification_code TEXT UNIQUE NOT NULL,
  qr_data TEXT,
  pdf_url TEXT,
  score_pct NUMERIC(5,2),
  hours_completed INTEGER,
  pillar TEXT CHECK (pillar IN ('RA', 'OE', 'AO')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  metadata JSONB DEFAULT '{}',
  org_id UUID REFERENCES public.orgs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can verify certificates by code" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Users can create their own certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all certificates" ON public.certificates FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON public.certificates(verification_code);

-- 2. QUESTIONNAIRES (User onboarding)
CREATE TABLE IF NOT EXISTS public.questionnaires (
  questionnaire_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  questionnaire_type TEXT DEFAULT 'onboarding' CHECK (questionnaire_type IN ('onboarding', 'assessment', 'feedback', 'survey')),
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  org_id UUID REFERENCES public.orgs(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questionnaires are viewable by authenticated users" ON public.questionnaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questionnaires" ON public.questionnaires FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- 3. QUESTIONNAIRE QUESTIONS
CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(questionnaire_id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('select_one', 'select_multiple', 'text', 'scale', 'rating')),
  options JSONB DEFAULT '[]',
  mapping_logic JSONB DEFAULT '{}',
  required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questionnaire questions are viewable by authenticated users" ON public.questionnaire_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questionnaire questions" ON public.questionnaire_questions FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- 4. QUESTIONNAIRE RESPONSES
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(questionnaire_id),
  answers JSONB NOT NULL DEFAULT '{}',
  computed_recommendations JSONB DEFAULT '{}',
  recommended_track_ids UUID[],
  recommended_course_ids UUID[],
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own responses" ON public.questionnaire_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own responses" ON public.questionnaire_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);