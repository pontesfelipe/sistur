
CREATE OR REPLACE FUNCTION public.start_assignment_exam(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_a public.classroom_assignments%ROWTYPE;
  v_check jsonb;
  v_ruleset public.exam_rulesets%ROWTYPE;
  v_question_count int;
  v_time_limit int;
  v_pillar text;
  v_course_id uuid;
  v_course_version int := 1;
  v_quiz_pool record;
  v_quiz_ids uuid[] := ARRAY[]::uuid[];
  v_easy uuid[] := ARRAY[]::uuid[];
  v_medium uuid[] := ARRAY[]::uuid[];
  v_hard uuid[] := ARRAY[]::uuid[];
  v_easy_count int;
  v_medium_count int;
  v_hard_count int;
  v_composition_hash text;
  v_exam_id uuid;
  v_attempt_id uuid;
  v_expires_at timestamptz;
  v_has_essay boolean := false;
  v_grading_mode text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Reuse the same validation as can_student_start_assignment
  v_check := public.can_student_start_assignment(p_assignment_id);
  IF (v_check->>'allowed')::boolean IS NOT TRUE THEN
    RETURN v_check;
  END IF;

  SELECT * INTO v_a FROM public.classroom_assignments WHERE id = p_assignment_id;

  IF v_a.assignment_type <> 'exam' OR v_a.exam_ruleset_id IS NULL THEN
    RAISE EXCEPTION 'not_an_exam_assignment';
  END IF;

  SELECT * INTO v_ruleset FROM public.exam_rulesets WHERE ruleset_id = v_a.exam_ruleset_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ruleset_not_found';
  END IF;

  v_question_count := COALESCE(v_ruleset.question_count, 10);
  v_time_limit := COALESCE(v_a.override_time_limit_minutes, v_ruleset.time_limit_minutes, 60);
  v_pillar := v_ruleset.pillar;
  v_course_id := v_ruleset.course_id;

  -- Course version (when ruleset is course-scoped)
  IF v_course_id IS NOT NULL THEN
    SELECT COALESCE(version, 1) INTO v_course_version
    FROM public.lms_courses WHERE course_id = v_course_id;
  END IF;

  -- Build pool by difficulty
  FOR v_quiz_pool IN
    SELECT quiz_id, difficulty
    FROM public.quiz_questions
    WHERE is_active = true
      AND (v_pillar IS NULL OR pillar = v_pillar)
  LOOP
    IF v_quiz_pool.difficulty <= 2 THEN
      v_easy := array_append(v_easy, v_quiz_pool.quiz_id);
    ELSIF v_quiz_pool.difficulty = 3 THEN
      v_medium := array_append(v_medium, v_quiz_pool.quiz_id);
    ELSE
      v_hard := array_append(v_hard, v_quiz_pool.quiz_id);
    END IF;
  END LOOP;

  IF (array_length(v_easy,1) + array_length(v_medium,1) + array_length(v_hard,1)) < v_question_count THEN
    RAISE EXCEPTION 'insufficient_questions: need % have %',
      v_question_count,
      (COALESCE(array_length(v_easy,1),0) + COALESCE(array_length(v_medium,1),0) + COALESCE(array_length(v_hard,1),0));
  END IF;

  v_easy_count := floor(v_question_count * 0.3);
  v_hard_count := floor(v_question_count * 0.2);
  v_medium_count := v_question_count - v_easy_count - v_hard_count;

  -- Random sample from each bucket
  SELECT ARRAY(SELECT q FROM unnest(v_easy) q ORDER BY random() LIMIT v_easy_count) INTO v_easy;
  SELECT ARRAY(SELECT q FROM unnest(v_medium) q ORDER BY random() LIMIT v_medium_count) INTO v_medium;
  SELECT ARRAY(SELECT q FROM unnest(v_hard) q ORDER BY random() LIMIT v_hard_count) INTO v_hard;

  v_quiz_ids := v_easy || v_medium || v_hard;

  -- Top up if a bucket was short
  IF array_length(v_quiz_ids, 1) < v_question_count THEN
    SELECT ARRAY(
      SELECT quiz_id FROM public.quiz_questions
      WHERE is_active = true
        AND (v_pillar IS NULL OR pillar = v_pillar)
        AND NOT (quiz_id = ANY(v_quiz_ids))
      ORDER BY random()
      LIMIT v_question_count - array_length(v_quiz_ids, 1)
    ) INTO v_easy;
    v_quiz_ids := v_quiz_ids || v_easy;
  END IF;

  -- Shuffle final order
  SELECT ARRAY(SELECT q FROM unnest(v_quiz_ids) q ORDER BY random()) INTO v_quiz_ids;

  -- Composition hash + collision-safe (append assignment + user + timestamp salt)
  v_composition_hash := encode(
    digest(
      array_to_string(v_quiz_ids, '-') || ':' || p_assignment_id::text || ':' || v_user::text || ':' || extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );

  -- Detect essay
  SELECT EXISTS(
    SELECT 1 FROM public.quiz_questions
    WHERE quiz_id = ANY(v_quiz_ids) AND question_type = 'essay'
  ) INTO v_has_essay;

  v_grading_mode := CASE WHEN v_has_essay THEN 'hybrid' ELSE 'automatic' END;
  v_expires_at := now() + make_interval(mins => v_time_limit + 1440);

  INSERT INTO public.exams (
    user_id, course_id, course_version, ruleset_id, pillar, track_id,
    composition_hash, question_ids, status, expires_at, started_at
  ) VALUES (
    v_user, v_course_id, v_course_version, v_ruleset.ruleset_id, v_pillar, NULL,
    v_composition_hash, v_quiz_ids, 'started', v_expires_at, now()
  ) RETURNING exam_id INTO v_exam_id;

  -- exam_questions with per-question shuffle seed
  INSERT INTO public.exam_questions (exam_id, quiz_id, display_order, options_shuffle_seed)
  SELECT v_exam_id, q.quiz_id, q.ord, floor(random() * 1000000)::int
  FROM unnest(v_quiz_ids) WITH ORDINALITY AS q(quiz_id, ord);

  -- Attempt
  INSERT INTO public.exam_attempts (exam_id, user_id, grading_mode)
  VALUES (v_exam_id, v_user, v_grading_mode::exam_grading_mode_type)
  RETURNING attempt_id INTO v_attempt_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'exam_id', v_exam_id,
    'attempt_id', v_attempt_id,
    'time_limit_minutes', v_time_limit,
    'min_score_pct', COALESCE(v_a.override_min_score_pct, v_ruleset.min_score_pct)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_assignment_exam(uuid) TO authenticated;
