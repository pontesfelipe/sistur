-- 1. RPC: get_assignment_progress
CREATE OR REPLACE FUNCTION public.get_assignment_progress(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_a public.classroom_assignments%ROWTYPE;
  v_max_attempts int;
  v_min_score numeric;
  v_students jsonb;
  v_kpis jsonb;
  v_total int := 0;
  v_started int := 0;
  v_submitted int := 0;
  v_passed int := 0;
  v_failed int := 0;
  v_pending int := 0;
  v_exhausted int := 0;
  v_avg_score numeric := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_a FROM public.classroom_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assignment_not_found';
  END IF;

  IF v_a.professor_id <> v_user
     AND NOT public.has_role(v_user, 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_a.exam_ruleset_id IS NOT NULL THEN
    SELECT COALESCE(v_a.override_max_attempts, er.max_attempts, 1),
           COALESCE(v_a.override_min_score_pct, er.min_score_pct, 70)
    INTO v_max_attempts, v_min_score
    FROM public.exam_rulesets er WHERE er.ruleset_id = v_a.exam_ruleset_id;
  ELSE
    v_max_attempts := COALESCE(v_a.override_max_attempts, 1);
    v_min_score := COALESCE(v_a.override_min_score_pct, 70);
  END IF;

  WITH targeted AS (
    SELECT cs.student_id
    FROM public.classroom_students cs
    WHERE cs.classroom_id = v_a.classroom_id
      AND (v_a.target_user_ids IS NULL OR cs.student_id = ANY(v_a.target_user_ids))
  ),
  attempts AS (
    SELECT
      ea.user_id,
      COUNT(*)::int AS attempts_count,
      MAX(ea.score_pct) AS best_score,
      MAX(ea.submitted_at) AS last_submitted_at,
      (ARRAY_AGG(ea.result::text ORDER BY ea.created_at DESC))[1] AS last_result,
      (ARRAY_AGG(ea.attempt_id ORDER BY ea.created_at DESC))[1] AS last_attempt_id,
      MIN(ea.started_at) AS first_started_at,
      bool_or(ea.result = 'passed') AS has_passed
    FROM public.exam_attempts ea
    JOIN public.exams e ON e.exam_id = ea.exam_id
    WHERE e.ruleset_id = v_a.exam_ruleset_id
      AND ea.created_at >= v_a.created_at
    GROUP BY ea.user_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'student_id', t.student_id,
      'student_name', COALESCE(p.full_name, 'Aluno'),
      'attempts_made', COALESCE(a.attempts_count, 0),
      'max_attempts', v_max_attempts,
      'best_score', a.best_score,
      'last_result', a.last_result,
      'last_submitted_at', a.last_submitted_at,
      'last_attempt_id', a.last_attempt_id,
      'first_started_at', a.first_started_at,
      'has_passed', COALESCE(a.has_passed, false),
      'status', CASE
        WHEN COALESCE(a.has_passed, false) THEN 'passed'
        WHEN a.attempts_count IS NULL OR a.attempts_count = 0 THEN 'not_started'
        WHEN a.last_result = 'pending' THEN 'pending_grading'
        WHEN a.attempts_count >= v_max_attempts AND NOT COALESCE(a.has_passed, false) THEN 'exhausted'
        WHEN a.last_result = 'failed' THEN 'failed_can_retry'
        ELSE 'in_progress'
      END
    ) ORDER BY COALESCE(p.full_name, 'Aluno')
  ) INTO v_students
  FROM targeted t
  LEFT JOIN attempts a ON a.user_id = t.student_id
  LEFT JOIN public.profiles p ON p.user_id = t.student_id;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE (s->>'attempts_made')::int > 0)::int,
    COUNT(*) FILTER (WHERE s->>'last_submitted_at' IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE (s->>'has_passed')::boolean)::int,
    COUNT(*) FILTER (WHERE s->>'status' = 'failed_can_retry')::int,
    COUNT(*) FILTER (WHERE s->>'status' = 'pending_grading')::int,
    COUNT(*) FILTER (WHERE s->>'status' = 'exhausted')::int,
    COALESCE(AVG((s->>'best_score')::numeric) FILTER (WHERE s->>'best_score' IS NOT NULL), 0)
  INTO v_total, v_started, v_submitted, v_passed, v_failed, v_pending, v_exhausted, v_avg_score
  FROM jsonb_array_elements(COALESCE(v_students, '[]'::jsonb)) s;

  v_kpis := jsonb_build_object(
    'total_students', v_total,
    'started', v_started,
    'submitted', v_submitted,
    'passed', v_passed,
    'failed', v_failed,
    'pending_grading', v_pending,
    'exhausted', v_exhausted,
    'not_started', v_total - v_started,
    'avg_score', round(v_avg_score, 1),
    'completion_rate', CASE WHEN v_total > 0 THEN round((v_submitted::numeric / v_total) * 100, 1) ELSE 0 END,
    'pass_rate', CASE WHEN v_submitted > 0 THEN round((v_passed::numeric / v_submitted) * 100, 1) ELSE 0 END
  );

  RETURN jsonb_build_object(
    'assignment', jsonb_build_object(
      'id', v_a.id,
      'title', v_a.title,
      'assignment_type', v_a.assignment_type,
      'classroom_id', v_a.classroom_id,
      'available_from', v_a.available_from,
      'due_date', v_a.due_date,
      'max_attempts', v_max_attempts,
      'min_score_pct', v_min_score
    ),
    'kpis', v_kpis,
    'students', COALESCE(v_students, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_progress(uuid) TO authenticated;

-- 2. extend_assignment_due_date
CREATE OR REPLACE FUNCTION public.extend_assignment_due_date(
  p_assignment_id uuid,
  p_new_due_date timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_a public.classroom_assignments%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_a FROM public.classroom_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  IF v_a.professor_id <> v_user AND NOT public.has_role(v_user, 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.classroom_assignments
  SET due_date = p_new_due_date, updated_at = now()
  WHERE id = p_assignment_id;

  INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
  SELECT cs.student_id, 'assignment_extended', 'Prazo prorrogado',
    v_a.title || ' — novo prazo: ' || to_char(p_new_due_date, 'DD/MM/YYYY HH24:MI'),
    '/edu/minhas-atividades',
    jsonb_build_object('assignment_id', v_a.id, 'new_due_date', p_new_due_date)
  FROM public.classroom_students cs
  WHERE cs.classroom_id = v_a.classroom_id
    AND (v_a.target_user_ids IS NULL OR cs.student_id = ANY(v_a.target_user_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.extend_assignment_due_date(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_assignment_due_date(uuid, timestamptz) TO authenticated;

-- 3. grant_extra_attempts
CREATE OR REPLACE FUNCTION public.grant_extra_attempts(
  p_assignment_id uuid,
  p_extra_count int DEFAULT 1
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_a public.classroom_assignments%ROWTYPE;
  v_current_max int;
  v_new_max int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_extra_count <= 0 OR p_extra_count > 10 THEN RAISE EXCEPTION 'invalid_extra_count'; END IF;
  SELECT * INTO v_a FROM public.classroom_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  IF v_a.professor_id <> v_user AND NOT public.has_role(v_user, 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_a.exam_ruleset_id IS NULL THEN RAISE EXCEPTION 'not_an_exam_assignment'; END IF;

  SELECT COALESCE(v_a.override_max_attempts, er.max_attempts, 1) INTO v_current_max
  FROM public.exam_rulesets er WHERE er.ruleset_id = v_a.exam_ruleset_id;

  v_new_max := v_current_max + p_extra_count;

  UPDATE public.classroom_assignments
  SET override_max_attempts = v_new_max, updated_at = now()
  WHERE id = p_assignment_id;

  INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
  SELECT cs.student_id, 'extra_attempts_granted', 'Tentativas extras liberadas',
    v_a.title || ' — agora você tem ' || v_new_max || ' tentativas',
    '/edu/minhas-atividades',
    jsonb_build_object('assignment_id', v_a.id, 'new_max_attempts', v_new_max)
  FROM public.classroom_students cs
  WHERE cs.classroom_id = v_a.classroom_id
    AND (v_a.target_user_ids IS NULL OR cs.student_id = ANY(v_a.target_user_ids));

  RETURN v_new_max;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_extra_attempts(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_extra_attempts(uuid, int) TO authenticated;

-- 4. send_assignment_reminder
CREATE OR REPLACE FUNCTION public.send_assignment_reminder(
  p_assignment_id uuid,
  p_mode text DEFAULT 'all_pending',
  p_custom_message text DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_a public.classroom_assignments%ROWTYPE;
  v_count int := 0;
  v_msg text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_mode NOT IN ('not_started', 'not_submitted', 'all_pending') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;
  SELECT * INTO v_a FROM public.classroom_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  IF v_a.professor_id <> v_user AND NOT public.has_role(v_user, 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_msg := COALESCE(p_custom_message,
    v_a.title || CASE WHEN v_a.due_date IS NOT NULL
      THEN ' — entrega até ' || to_char(v_a.due_date, 'DD/MM/YYYY HH24:MI')
      ELSE '' END);

  WITH targeted AS (
    SELECT cs.student_id FROM public.classroom_students cs
    WHERE cs.classroom_id = v_a.classroom_id
      AND (v_a.target_user_ids IS NULL OR cs.student_id = ANY(v_a.target_user_ids))
  ),
  status AS (
    SELECT t.student_id,
      EXISTS(SELECT 1 FROM public.exam_attempts ea JOIN public.exams e ON e.exam_id = ea.exam_id
        WHERE ea.user_id = t.student_id AND e.ruleset_id = v_a.exam_ruleset_id
        AND ea.created_at >= v_a.created_at) AS has_attempt,
      EXISTS(SELECT 1 FROM public.exam_attempts ea JOIN public.exams e ON e.exam_id = ea.exam_id
        WHERE ea.user_id = t.student_id AND e.ruleset_id = v_a.exam_ruleset_id
        AND ea.created_at >= v_a.created_at AND ea.submitted_at IS NOT NULL) AS has_submitted,
      EXISTS(SELECT 1 FROM public.exam_attempts ea JOIN public.exams e ON e.exam_id = ea.exam_id
        WHERE ea.user_id = t.student_id AND e.ruleset_id = v_a.exam_ruleset_id
        AND ea.created_at >= v_a.created_at AND ea.result = 'passed') AS has_passed
    FROM targeted t
  ),
  inserted AS (
    INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
    SELECT s.student_id, 'assignment_reminder', 'Lembrete de atividade', v_msg,
      '/edu/minhas-atividades',
      jsonb_build_object('assignment_id', v_a.id, 'mode', p_mode)
    FROM status s
    WHERE NOT s.has_passed
      AND CASE p_mode
        WHEN 'not_started' THEN NOT s.has_attempt
        WHEN 'not_submitted' THEN NOT s.has_submitted
        ELSE NOT s.has_submitted
      END
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_assignment_reminder(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_assignment_reminder(uuid, text, text) TO authenticated;