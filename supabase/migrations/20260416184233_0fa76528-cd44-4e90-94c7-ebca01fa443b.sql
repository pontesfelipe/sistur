
-- 1) Add target users array (NULL = all classroom) + per-assignment overrides
ALTER TABLE public.classroom_assignments
  ADD COLUMN IF NOT EXISTS target_user_ids uuid[] NULL,
  ADD COLUMN IF NOT EXISTS override_time_limit_minutes int NULL,
  ADD COLUMN IF NOT EXISTS override_max_attempts int NULL,
  ADD COLUMN IF NOT EXISTS override_min_score_pct numeric NULL;

-- 2) Tighten students SELECT policy: respect target_user_ids and available_from
DROP POLICY IF EXISTS "Students see classroom assignments" ON public.classroom_assignments;
CREATE POLICY "Students see assigned activities"
ON public.classroom_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.classroom_id = classroom_assignments.classroom_id
      AND cs.student_id = auth.uid()
  )
  AND (
    target_user_ids IS NULL
    OR auth.uid() = ANY(target_user_ids)
  )
);

-- 3) Trigger: notify targeted students on assignment creation
CREATE OR REPLACE FUNCTION public.notify_classroom_assignment_targets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid;
  v_classroom_name text;
BEGIN
  SELECT name INTO v_classroom_name FROM public.classrooms WHERE id = NEW.classroom_id;

  FOR v_student IN
    SELECT cs.student_id
    FROM public.classroom_students cs
    WHERE cs.classroom_id = NEW.classroom_id
      AND (NEW.target_user_ids IS NULL OR cs.student_id = ANY(NEW.target_user_ids))
  LOOP
    INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_student,
      'assignment_created',
      CASE NEW.assignment_type
        WHEN 'exam' THEN 'Nova prova atribuída'
        WHEN 'track' THEN 'Nova trilha atribuída'
        WHEN 'training' THEN 'Novo treinamento atribuído'
        ELSE 'Nova atividade atribuída'
      END,
      COALESCE(v_classroom_name, 'Sala') || ': ' || NEW.title
        || CASE WHEN NEW.available_from > now()
                THEN ' — disponível em ' || to_char(NEW.available_from, 'DD/MM/YYYY HH24:MI')
                ELSE '' END
        || CASE WHEN NEW.due_date IS NOT NULL
                THEN ' — entrega até ' || to_char(NEW.due_date, 'DD/MM/YYYY HH24:MI')
                ELSE '' END,
      '/edu/minhas-atividades',
      jsonb_build_object(
        'assignment_id', NEW.id,
        'classroom_id', NEW.classroom_id,
        'assignment_type', NEW.assignment_type,
        'available_from', NEW.available_from,
        'due_date', NEW.due_date
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_classroom_assignment ON public.classroom_assignments;
CREATE TRIGGER trg_notify_classroom_assignment
AFTER INSERT ON public.classroom_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_classroom_assignment_targets();

-- 4) RPC: list student's assignments (for any classroom they belong to + targeted to them)
CREATE OR REPLACE FUNCTION public.get_my_classroom_assignments()
RETURNS TABLE (
  id uuid,
  classroom_id uuid,
  classroom_name text,
  professor_id uuid,
  professor_name text,
  assignment_type text,
  title text,
  description text,
  track_id uuid,
  training_id text,
  exam_ruleset_id uuid,
  due_date timestamptz,
  available_from timestamptz,
  override_time_limit_minutes int,
  override_max_attempts int,
  override_min_score_pct numeric,
  status text,
  created_at timestamptz,
  is_open boolean,
  is_overdue boolean,
  attempts_made int,
  last_attempt_result text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.classroom_id,
    c.name AS classroom_name,
    a.professor_id,
    p.full_name AS professor_name,
    a.assignment_type,
    a.title,
    a.description,
    a.track_id,
    a.training_id,
    a.exam_ruleset_id,
    a.due_date,
    a.available_from,
    a.override_time_limit_minutes,
    a.override_max_attempts,
    a.override_min_score_pct,
    a.status,
    a.created_at,
    (a.available_from IS NULL OR a.available_from <= now())
      AND (a.due_date IS NULL OR a.due_date >= now()) AS is_open,
    (a.due_date IS NOT NULL AND a.due_date < now()) AS is_overdue,
    COALESCE((
      SELECT COUNT(*)::int
      FROM public.exam_attempts ea
      JOIN public.exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = auth.uid()
        AND e.ruleset_id = a.exam_ruleset_id
        AND ea.created_at >= a.created_at
    ), 0) AS attempts_made,
    (
      SELECT ea.result::text
      FROM public.exam_attempts ea
      JOIN public.exams e ON e.exam_id = ea.exam_id
      WHERE ea.user_id = auth.uid()
        AND e.ruleset_id = a.exam_ruleset_id
        AND ea.created_at >= a.created_at
      ORDER BY ea.created_at DESC LIMIT 1
    ) AS last_attempt_result
  FROM public.classroom_assignments a
  JOIN public.classrooms c ON c.id = a.classroom_id
  LEFT JOIN public.profiles p ON p.user_id = a.professor_id
  WHERE a.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.classroom_students cs
      WHERE cs.classroom_id = a.classroom_id AND cs.student_id = auth.uid()
    )
    AND (a.target_user_ids IS NULL OR auth.uid() = ANY(a.target_user_ids))
  ORDER BY
    CASE WHEN a.due_date IS NULL THEN 1 ELSE 0 END,
    a.due_date ASC,
    a.created_at DESC;
$$;

-- 5) RPC: server-authoritative validation that a student may start an assignment exam
CREATE OR REPLACE FUNCTION public.can_student_start_assignment(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_a public.classroom_assignments%ROWTYPE;
  v_max_attempts int;
  v_attempts int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_a FROM public.classroom_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'assignment_not_found');
  END IF;

  -- enrolled in classroom?
  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_students
    WHERE classroom_id = v_a.classroom_id AND student_id = v_user
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_enrolled');
  END IF;

  -- targeted?
  IF v_a.target_user_ids IS NOT NULL AND NOT (v_user = ANY(v_a.target_user_ids)) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_targeted');
  END IF;

  -- window
  IF v_a.available_from IS NOT NULL AND v_a.available_from > now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'not_yet_open',
      'available_from', v_a.available_from
    );
  END IF;

  IF v_a.due_date IS NOT NULL AND v_a.due_date < now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'past_due',
      'due_date', v_a.due_date
    );
  END IF;

  -- attempts (only for exam type)
  IF v_a.assignment_type = 'exam' AND v_a.exam_ruleset_id IS NOT NULL THEN
    SELECT COALESCE(v_a.override_max_attempts, er.max_attempts, 1)
    INTO v_max_attempts
    FROM public.exam_rulesets er WHERE er.ruleset_id = v_a.exam_ruleset_id;

    SELECT COUNT(*)::int INTO v_attempts
    FROM public.exam_attempts ea
    JOIN public.exams e ON e.exam_id = ea.exam_id
    WHERE ea.user_id = v_user
      AND e.ruleset_id = v_a.exam_ruleset_id
      AND ea.created_at >= v_a.created_at;

    IF v_attempts >= COALESCE(v_max_attempts, 1) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'max_attempts_reached',
        'attempts_made', v_attempts,
        'max_attempts', v_max_attempts
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'assignment_id', p_assignment_id,
    'exam_ruleset_id', v_a.exam_ruleset_id,
    'override_time_limit_minutes', v_a.override_time_limit_minutes,
    'override_min_score_pct', v_a.override_min_score_pct
  );
END;
$$;
