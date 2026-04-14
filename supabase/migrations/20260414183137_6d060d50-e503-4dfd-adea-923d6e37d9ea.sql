
-- 1. Create org-scoped role check function
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND org_id = _org_id
  )
$$;

-- 2. Update finalize_essay_grading with org-scoped authorization
CREATE OR REPLACE FUNCTION public.finalize_essay_grading(_attempt_id uuid, _grades jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _exam_id uuid;
  _user_id uuid;
  _org_id uuid;
  _grade jsonb;
  _quiz_id uuid;
  _points numeric;
  _comment text;
  _max_points numeric;
  _total_answers int;
  _total_score numeric;
  _min_score numeric := 70;
  _ruleset_id uuid;
  _course_id uuid;
  _course_version int;
  _result text;
  _cert_id text;
  _verification_code text := '';
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _i int;
  _primary_pillar text;
  _workload_minutes int;
BEGIN
  -- Get attempt info
  SELECT a.exam_id, a.user_id INTO _exam_id, _user_id
  FROM public.exam_attempts a
  WHERE a.attempt_id = _attempt_id AND a.result = 'pending';

  IF _exam_id IS NULL THEN
    RAISE EXCEPTION 'attempt_not_found_or_not_pending';
  END IF;

  -- Get org_id from the exam's course
  SELECT c.org_id INTO _org_id
  FROM public.exams e
  JOIN public.lms_courses c ON c.course_id = e.course_id
  WHERE e.exam_id = _exam_id;

  -- Org-scoped admin check: user must be ADMIN in the exam's organization
  -- Falls back to global ADMIN check if org_id is NULL (global exams)
  IF _org_id IS NOT NULL THEN
    IF NOT public.has_role_in_org(auth.uid(), _org_id, 'ADMIN'::app_role) 
       AND NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  ELSE
    IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  -- Get total answers for point calculation
  SELECT COUNT(*) INTO _total_answers
  FROM public.exam_answers WHERE attempt_id = _attempt_id;

  _max_points := 100.0 / GREATEST(_total_answers, 1);

  -- Apply each grade
  FOR _grade IN SELECT * FROM jsonb_array_elements(_grades)
  LOOP
    _quiz_id := (_grade->>'quiz_id')::uuid;
    _points := LEAST(GREATEST((_grade->>'points')::numeric, 0), _max_points);
    _comment := _grade->>'comment';

    UPDATE public.exam_answers
    SET awarded_points = _points,
        is_correct = (_points > 0),
        grader_comment = NULLIF(_comment, '')
    WHERE attempt_id = _attempt_id AND quiz_id = _quiz_id;
  END LOOP;

  -- Recalculate total
  SELECT COALESCE(SUM(awarded_points), 0) INTO _total_score
  FROM public.exam_answers WHERE attempt_id = _attempt_id;

  -- Get min score from ruleset
  SELECT e.ruleset_id, e.course_id, e.course_version
  INTO _ruleset_id, _course_id, _course_version
  FROM public.exams e WHERE e.exam_id = _exam_id;

  IF _ruleset_id IS NOT NULL THEN
    SELECT min_score_pct INTO _min_score
    FROM public.exam_rulesets WHERE ruleset_id = _ruleset_id;
  END IF;

  _result := CASE WHEN _total_score >= _min_score THEN 'passed' ELSE 'failed' END;

  UPDATE public.exam_attempts
  SET score_pct = _total_score, result = _result::exam_result_type
  WHERE attempt_id = _attempt_id;

  -- Issue certificate if passed
  IF _result = 'passed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.lms_certificates WHERE attempt_id = _attempt_id) THEN
      SELECT primary_pillar, workload_minutes
      INTO _primary_pillar, _workload_minutes
      FROM public.lms_courses WHERE course_id = _course_id;

      IF _primary_pillar IS NOT NULL THEN
        FOR _i IN 1..16 LOOP
          _verification_code := _verification_code
            || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
        END LOOP;
        _cert_id := public.generate_certificate_id();

        INSERT INTO public.lms_certificates (
          certificate_id, user_id, course_id, course_version, attempt_id,
          workload_minutes, pillar_scope, verification_code, status
        ) VALUES (
          _cert_id, _user_id, _course_id, _course_version, _attempt_id,
          COALESCE(_workload_minutes, 60), _primary_pillar, _verification_code, 'active'
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'total_score', _total_score,
    'result', _result,
    'certificate_id', _cert_id
  );
END;
$function$;
