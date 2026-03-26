
-- =====================================================
-- PROFESSOR REFERRAL & CLASSROOM MANAGEMENT SYSTEM
-- =====================================================

-- 1. Professor referral codes
CREATE TABLE public.professor_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT professor_referral_codes_code_check CHECK (length(code) >= 4 AND length(code) <= 20)
);

ALTER TABLE public.professor_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors see own codes" ON public.professor_referral_codes
  FOR SELECT TO authenticated
  USING (professor_id = auth.uid());

CREATE POLICY "Professors insert own codes" ON public.professor_referral_codes
  FOR INSERT TO authenticated
  WITH CHECK (professor_id = auth.uid());

-- 2. Student-professor referral tracking
CREATE TABLE public.student_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE,
  professor_id UUID NOT NULL,
  referral_code_id UUID REFERENCES public.professor_referral_codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors see their referrals" ON public.student_referrals
  FOR SELECT TO authenticated
  USING (professor_id = auth.uid());

CREATE POLICY "Students see own referral" ON public.student_referrals
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Authenticated insert referrals" ON public.student_referrals
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Admin access
CREATE POLICY "Admins manage referral codes" ON public.professor_referral_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins manage referrals" ON public.student_referrals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- 3. Classrooms (Salas/Turmas)
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discipline TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own classrooms" ON public.classrooms
  FOR ALL TO authenticated
  USING (professor_id = auth.uid());

CREATE POLICY "Admins manage classrooms" ON public.classrooms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- 4. Classroom students
CREATE TABLE public.classroom_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, student_id)
);

ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- Professor who owns classroom can manage
CREATE OR REPLACE FUNCTION public.owns_classroom(p_user_id UUID, p_classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND professor_id = p_user_id
  )
$$;

CREATE POLICY "Professors manage classroom students" ON public.classroom_students
  FOR ALL TO authenticated
  USING (public.owns_classroom(auth.uid(), classroom_id));

CREATE POLICY "Students see own enrollment" ON public.classroom_students
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins manage classroom students" ON public.classroom_students
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- 5. Classroom assignments (trilhas, tests, custom content)
CREATE TABLE public.classroom_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('track', 'training', 'exam', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  -- References (nullable, depends on type)
  track_id UUID REFERENCES public.edu_tracks(id) ON DELETE SET NULL,
  training_id TEXT,
  exam_ruleset_id UUID,
  -- Deadlines
  due_date TIMESTAMPTZ,
  available_from TIMESTAMPTZ DEFAULT now(),
  -- Custom content
  custom_content JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own assignments" ON public.classroom_assignments
  FOR ALL TO authenticated
  USING (professor_id = auth.uid());

CREATE POLICY "Students see classroom assignments" ON public.classroom_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.classroom_id = classroom_assignments.classroom_id
    AND cs.student_id = auth.uid()
  ));

CREATE POLICY "Admins manage assignments" ON public.classroom_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- 6. Function: count active referred students for a professor
CREATE OR REPLACE FUNCTION public.get_professor_referral_count(p_professor_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.student_referrals
  WHERE professor_id = p_professor_id AND status = 'active'
$$;

-- 7. Function: check if professor qualifies for free license (5+ active students)
CREATE OR REPLACE FUNCTION public.professor_qualifies_free_license(p_professor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_professor_referral_count(p_professor_id) >= 5
$$;

-- 8. Function to link a student via referral code
CREATE OR REPLACE FUNCTION public.link_student_referral(p_referral_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_code_record RECORD;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Check if already linked
  IF EXISTS (SELECT 1 FROM public.student_referrals WHERE student_id = v_student_id) THEN
    RETURN FALSE; -- Already has a referral
  END IF;

  -- Find the referral code
  SELECT * INTO v_code_record
  FROM public.professor_referral_codes
  WHERE code = UPPER(TRIM(p_referral_code));

  IF NOT FOUND THEN
    RETURN FALSE; -- Invalid code
  END IF;

  -- Cannot refer yourself
  IF v_code_record.professor_id = v_student_id THEN
    RETURN FALSE;
  END IF;

  -- Create the referral link
  INSERT INTO public.student_referrals (student_id, professor_id, referral_code_id)
  VALUES (v_student_id, v_code_record.professor_id, v_code_record.id);

  RETURN TRUE;
END;
$$;

-- Indexes
CREATE INDEX idx_student_referrals_professor ON public.student_referrals(professor_id);
CREATE INDEX idx_classroom_students_classroom ON public.classroom_students(classroom_id);
CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments(classroom_id);
