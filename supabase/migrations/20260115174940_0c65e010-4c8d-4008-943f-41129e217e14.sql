-- ==========================================
-- SISTUR EDU LMS - SPRINT 1: EXAMS & CERTIFICATES
-- Schema 4: Dynamic Exams, Attempts, Certificates
-- ==========================================

-- ==========================================
-- EXAM RULESETS (Configuration)
-- ==========================================

CREATE TABLE public.exam_rulesets (
  ruleset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  min_score_pct DECIMAL(5,2) NOT NULL CHECK (min_score_pct BETWEEN 0 AND 100),
  time_limit_minutes INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  pillar_mix JSONB,
  allow_retake BOOLEAN DEFAULT true,
  retake_wait_hours INTEGER DEFAULT 24,
  max_attempts INTEGER DEFAULT 3,
  min_days_between_same_quiz INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id)
);

-- ==========================================
-- EXAMS (Generated unique per user)
-- ==========================================

CREATE TYPE public.exam_status_type AS ENUM ('generated', 'started', 'submitted', 'expired', 'voided');

CREATE TABLE public.exams (
  exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL DEFAULT 1,
  ruleset_id UUID REFERENCES public.exam_rulesets(ruleset_id),
  composition_hash TEXT NOT NULL,
  question_ids UUID[] NOT NULL,
  status exam_status_type NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  UNIQUE(composition_hash)
);

CREATE INDEX idx_exams_user ON public.exams(user_id);
CREATE INDEX idx_exams_course ON public.exams(course_id);
CREATE INDEX idx_exams_status ON public.exams(status);
CREATE INDEX idx_exams_hash ON public.exams(composition_hash);

-- ==========================================
-- EXAM QUESTIONS (with randomization seed)
-- ==========================================

CREATE TABLE public.exam_questions (
  exam_id UUID REFERENCES public.exams(exam_id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quiz_questions(quiz_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  options_shuffle_seed INTEGER,
  PRIMARY KEY (exam_id, quiz_id)
);

CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id, display_order);

-- ==========================================
-- EXAM ATTEMPTS
-- ==========================================

CREATE TYPE public.exam_result_type AS ENUM ('passed', 'failed', 'pending');
CREATE TYPE public.grading_mode_type AS ENUM ('automatic', 'hybrid', 'manual');

CREATE TABLE public.exam_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(exam_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score_pct DECIMAL(5,2),
  result exam_result_type DEFAULT 'pending',
  grading_mode grading_mode_type DEFAULT 'automatic',
  ip_address INET,
  user_agent TEXT,
  audit_trail_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_attempts_exam ON public.exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_user ON public.exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_result ON public.exam_attempts(result);

-- ==========================================
-- EXAM ANSWERS
-- ==========================================

CREATE TABLE public.exam_answers (
  attempt_id UUID REFERENCES public.exam_attempts(attempt_id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quiz_questions(quiz_id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(option_id),
  free_text_answer TEXT,
  is_correct BOOLEAN,
  awarded_points DECIMAL(5,2) DEFAULT 0,
  answered_at TIMESTAMPTZ,
  PRIMARY KEY (attempt_id, quiz_id)
);

CREATE INDEX idx_exam_answers_attempt ON public.exam_answers(attempt_id);

-- ==========================================
-- CERTIFICATES
-- ==========================================

CREATE TYPE public.certificate_status_type AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE public.lms_certificates (
  certificate_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.lms_courses(course_id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL,
  attempt_id UUID REFERENCES public.exam_attempts(attempt_id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workload_minutes INTEGER NOT NULL,
  pillar_scope TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  qr_verify_url TEXT,
  pdf_uri TEXT,
  pdf_generated_at TIMESTAMPTZ,
  status certificate_status_type DEFAULT 'active',
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lms_certificates_user ON public.lms_certificates(user_id);
CREATE INDEX idx_lms_certificates_course ON public.lms_certificates(course_id);
CREATE INDEX idx_lms_certificates_verification ON public.lms_certificates(verification_code);
CREATE INDEX idx_lms_certificates_issued ON public.lms_certificates(issued_at DESC);

-- ==========================================
-- CERTIFICATE ID GENERATOR FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.generate_certificate_id()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO sequence_part
  FROM public.lms_certificates
  WHERE certificate_id LIKE 'CERT-' || year_part || '-%';
  RETURN 'CERT-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.exam_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_certificates ENABLE ROW LEVEL SECURITY;

-- Exam Rulesets
CREATE POLICY "Anyone can view exam rulesets"
  ON public.exam_rulesets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exam rulesets"
  ON public.exam_rulesets FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Exams
CREATE POLICY "Users can view their own exams"
  ON public.exams FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own exams"
  ON public.exams FOR ALL
  USING (user_id = auth.uid());

-- Exam Questions
CREATE POLICY "Users can view their exam questions"
  ON public.exam_questions FOR SELECT
  USING (exam_id IN (SELECT exam_id FROM public.exams WHERE user_id = auth.uid()));

-- Exam Attempts
CREATE POLICY "Users can view their own attempts"
  ON public.exam_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own attempts"
  ON public.exam_attempts FOR ALL
  USING (user_id = auth.uid());

-- Exam Answers
CREATE POLICY "Users can manage their own answers"
  ON public.exam_answers FOR ALL
  USING (attempt_id IN (SELECT attempt_id FROM public.exam_attempts WHERE user_id = auth.uid()));

-- Certificates
CREATE POLICY "Users can view their own certificates"
  ON public.lms_certificates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can verify active certificates"
  ON public.lms_certificates FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage certificates"
  ON public.lms_certificates FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));