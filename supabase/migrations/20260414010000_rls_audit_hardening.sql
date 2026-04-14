-- =============================================================================
-- SISTUR: RLS audit remediation
-- =============================================================================
-- Addresses the ten findings reported in the April 2026 RLS audit
-- (4 CRITICAL / 4 HIGH / 2 MEDIUM). Each section header references the finding
-- number in the audit report.
--
-- Migration design notes:
-- * All DROP POLICY statements use IF EXISTS so the file stays idempotent.
-- * SECURITY DEFINER functions use SET search_path = public to defeat
--   search-path hijacking.
-- * Column-level GRANT/REVOKE is used where RLS cannot enforce column-scoped
--   writes (Postgres RLS is row-level only).

-- -----------------------------------------------------------------------------
-- 0. Helper: org-scoped role check
-- -----------------------------------------------------------------------------
-- `public.has_role` is org-agnostic (returns true if the user is ADMIN in ANY
-- org). That lets an admin of org A manage resources of org B when a policy
-- uses `has_role` as the sole check. This helper pairs role and org in one
-- call and is used by the policies recreated below.
CREATE OR REPLACE FUNCTION public.has_role_in_org(
  _user_id uuid,
  _role public.app_role,
  _org_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND org_id = _org_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, public.app_role, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Finding #1 [CRITICAL]: Users can self-grade exam attempts and mint certificates
-- -----------------------------------------------------------------------------
-- Root cause: `FOR ALL USING (user_id = auth.uid())` on `exam_attempts` /
-- `exam_answers` with no WITH CHECK, plus a client-side write path in
-- `useExams.ts` that directly sets `result='passed'` / inserts into
-- `lms_certificates`. Fix:
--   (a) Split the blanket FOR ALL policies into INSERT/UPDATE/DELETE with
--       WITH CHECK clauses.
--   (b) Column-level REVOKE so authenticated callers cannot set grading
--       columns from the client.
--   (c) Forbid client INSERT on `lms_certificates` entirely.
--   (d) Provide a SECURITY DEFINER RPC `submit_exam_attempt` that grades
--       server-side and issues the certificate atomically.

-- (a) Replace FOR ALL policies
DROP POLICY IF EXISTS "Users can manage their own attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can manage their own answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can manage their own exams" ON public.exams;

CREATE POLICY "Users can insert their own attempts"
  ON public.exam_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts"
  ON public.exam_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attempts"
  ON public.exam_attempts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own answers"
  ON public.exam_answers FOR INSERT TO authenticated
  WITH CHECK (
    attempt_id IN (SELECT attempt_id FROM public.exam_attempts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own answers"
  ON public.exam_answers FOR UPDATE TO authenticated
  USING (
    attempt_id IN (SELECT attempt_id FROM public.exam_attempts WHERE user_id = auth.uid())
  )
  WITH CHECK (
    attempt_id IN (SELECT attempt_id FROM public.exam_attempts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own answers"
  ON public.exam_answers FOR DELETE TO authenticated
  USING (
    attempt_id IN (SELECT attempt_id FROM public.exam_attempts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own exams"
  ON public.exams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exams"
  ON public.exams FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exams"
  ON public.exams FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- (b) Column-level write guards on grading fields. authenticated can still
--     INSERT the attempt (all columns) and UPDATE the fields listed below;
--     grading columns are writable only by the submit_exam_attempt RPC
--     (SECURITY DEFINER = runs as table owner, bypasses these grants).
REVOKE UPDATE ON public.exam_attempts FROM authenticated;
GRANT  UPDATE (started_at, ip_address, user_agent) ON public.exam_attempts TO authenticated;

REVOKE UPDATE ON public.exam_answers FROM authenticated;
GRANT  UPDATE (selected_option_id, free_text_answer, answered_at) ON public.exam_answers TO authenticated;

-- (c) Certificate issuance is server-only
REVOKE INSERT, UPDATE, DELETE ON public.lms_certificates FROM authenticated;

-- (d) Server-side grading + certificate issuance RPC
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _exam_id uuid;
  _ruleset_id uuid;
  _course_id uuid;
  _course_version int;
  _min_score numeric := 70;
  _total int;
  _earned numeric := 0;
  _has_essay boolean := false;
  _result public.exam_result_type;
  _grading_mode public.grading_mode_type;
  _course_title text;
  _primary_pillar text;
  _workload_minutes int;
  _cert_id text;
  _verification_code text := '';
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _i int;
BEGIN
  SELECT a.user_id, a.exam_id
  INTO _user_id, _exam_id
  FROM public.exam_attempts a
  WHERE a.attempt_id = _attempt_id;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'attempt not found';
  END IF;
  IF auth.uid() IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Short-circuit if already submitted
  PERFORM 1 FROM public.exam_attempts
   WHERE attempt_id = _attempt_id AND submitted_at IS NOT NULL;
  IF FOUND THEN
    RAISE EXCEPTION 'attempt already submitted';
  END IF;

  SELECT ruleset_id, course_id, course_version
  INTO _ruleset_id, _course_id, _course_version
  FROM public.exams WHERE exam_id = _exam_id;

  IF _ruleset_id IS NOT NULL THEN
    SELECT min_score_pct INTO _min_score
    FROM public.exam_rulesets WHERE ruleset_id = _ruleset_id;
  END IF;

  SELECT COUNT(*) INTO _total
  FROM public.exam_answers WHERE attempt_id = _attempt_id;

  IF _total = 0 THEN
    RAISE EXCEPTION 'no answers to grade';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.exam_answers a
    JOIN public.quiz_questions q ON q.quiz_id = a.quiz_id
    WHERE a.attempt_id = _attempt_id AND q.question_type = 'essay'
  ) INTO _has_essay;

  -- Auto-grade everything that isn't an essay
  UPDATE public.exam_answers a
     SET is_correct = CASE
           WHEN q.question_type = 'essay' THEN NULL
           ELSE COALESCE(
             (SELECT o.is_correct FROM public.quiz_options o
               WHERE o.option_id = a.selected_option_id),
             false)
         END,
         awarded_points = CASE
           WHEN q.question_type = 'essay' THEN 0
           WHEN COALESCE(
                  (SELECT o.is_correct FROM public.quiz_options o
                    WHERE o.option_id = a.selected_option_id),
                  false)
             THEN (100.0 / _total)
           ELSE 0
         END
    FROM public.quiz_questions q
   WHERE a.attempt_id = _attempt_id
     AND q.quiz_id = a.quiz_id;

  SELECT COALESCE(SUM(awarded_points), 0) INTO _earned
  FROM public.exam_answers WHERE attempt_id = _attempt_id;

  _grading_mode := CASE WHEN _has_essay THEN 'hybrid' ELSE 'automatic' END;
  _result := CASE
    WHEN _has_essay THEN 'pending'
    WHEN _earned >= _min_score THEN 'passed'
    ELSE 'failed'
  END;

  UPDATE public.exam_attempts
     SET score_pct = _earned,
         result = _result,
         grading_mode = _grading_mode,
         submitted_at = now()
   WHERE attempt_id = _attempt_id;

  UPDATE public.exams
     SET status = 'submitted', submitted_at = now()
   WHERE exam_id = _exam_id;

  -- Quiz usage history for retake gating
  INSERT INTO public.quiz_usage_history (user_id, quiz_id, last_used_at, times_used)
  SELECT _user_id, a.quiz_id, now(), 1
    FROM public.exam_answers a
   WHERE a.attempt_id = _attempt_id
  ON CONFLICT (user_id, quiz_id) DO UPDATE
    SET last_used_at = EXCLUDED.last_used_at,
        times_used = public.quiz_usage_history.times_used + 1;

  -- Issue certificate on automatic passes only; hybrid waits for manual review
  IF _result = 'passed' AND NOT _has_essay THEN
    SELECT title, primary_pillar, workload_minutes
      INTO _course_title, _primary_pillar, _workload_minutes
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

  RETURN jsonb_build_object(
    'attempt_id', _attempt_id,
    'score_pct', _earned,
    'result', _result,
    'grading_mode', _grading_mode,
    'certificate_id', _cert_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_exam_attempt(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Finding #2 [CRITICAL]: quiz_options.is_correct readable by students
-- -----------------------------------------------------------------------------
-- Root cause: `quiz_options` SELECT policy returns every column — including
-- the answer key — to any authenticated user.
--
-- Fix: REVOKE column-level SELECT on `is_correct` from client roles; expose
-- a SECURITY DEFINER review RPC so students can see correctness AFTER
-- submission, and an admin RPC so the question builder still works.

REVOKE SELECT (is_correct) ON public.quiz_options FROM authenticated;
REVOKE SELECT (is_correct) ON public.quiz_options FROM anon;

-- Admin RPC: question-bank editor reads full options including is_correct
CREATE OR REPLACE FUNCTION public.admin_get_quiz_options(_quiz_id uuid)
RETURNS SETOF public.quiz_options
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.quiz_options
   WHERE quiz_id = _quiz_id
     AND public.has_role(auth.uid(), 'ADMIN'::public.app_role)
   ORDER BY option_label;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_quiz_options(uuid) TO authenticated;

-- Admin RPC: batch variant for the question-bank list view so we don't issue
-- one round trip per question after the column-level REVOKE above breaks the
-- previous PostgREST `quiz_options(*)` join. Accepts NULL to return every
-- option visible to the admin (used when no filter is applied).
CREATE OR REPLACE FUNCTION public.admin_list_quiz_options(_quiz_ids uuid[] DEFAULT NULL)
RETURNS SETOF public.quiz_options
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.quiz_options
   WHERE public.has_role(auth.uid(), 'ADMIN'::public.app_role)
     AND (_quiz_ids IS NULL OR quiz_id = ANY(_quiz_ids))
   ORDER BY quiz_id, option_label;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_quiz_options(uuid[]) TO authenticated;

-- Student review RPC: returns correctness only for a *submitted* attempt the
-- caller owns, so mistakes can be reviewed without leaking the answer key
-- during an active exam.
CREATE OR REPLACE FUNCTION public.review_exam_answers(_attempt_id uuid)
RETURNS TABLE (
  quiz_id uuid,
  selected_option_id uuid,
  free_text_answer text,
  is_correct boolean,
  awarded_points numeric,
  answered_at timestamptz,
  stem text,
  question_type text,
  explanation text,
  options jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _submitted_at timestamptz;
BEGIN
  SELECT a.user_id, a.submitted_at INTO _owner, _submitted_at
    FROM public.exam_attempts a WHERE a.attempt_id = _attempt_id;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'attempt not found';
  END IF;
  IF _owner <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _submitted_at IS NULL THEN
    RAISE EXCEPTION 'attempt not submitted yet';
  END IF;

  RETURN QUERY
    SELECT a.quiz_id,
           a.selected_option_id,
           a.free_text_answer,
           a.is_correct,
           a.awarded_points,
           a.answered_at,
           q.stem,
           q.question_type::text,
           q.explanation,
           COALESCE((
             SELECT jsonb_agg(
               jsonb_build_object(
                 'option_id', o.option_id,
                 'option_label', o.option_label,
                 'option_text', o.option_text,
                 'is_correct', o.is_correct
               ) ORDER BY o.option_label
             )
             FROM public.quiz_options o
             WHERE o.quiz_id = a.quiz_id
           ), '[]'::jsonb) AS options
      FROM public.exam_answers a
      LEFT JOIN public.quiz_questions q ON q.quiz_id = a.quiz_id
     WHERE a.attempt_id = _attempt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_exam_answers(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Finding #10 [MEDIUM]: lms_certificates bulk-enumerable via status='active'
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can verify active certificates" ON public.lms_certificates;

-- Public verification endpoint: keyed by verification code, returns only
-- the fields a verification page needs.
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'certificate_id', c.certificate_id,
    'course_title', co.title,
    'issued_at', c.issued_at,
    'workload_minutes', c.workload_minutes,
    'pillar_scope', c.pillar_scope,
    'status', c.status,
    'holder_name', p.full_name
  )
  FROM public.lms_certificates c
  LEFT JOIN public.lms_courses co ON co.course_id = c.course_id
  LEFT JOIN public.profiles p     ON p.user_id = c.user_id
  WHERE c.verification_code = _code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- Finding #3 [CRITICAL]: complete_user_onboarding self-promotion
-- -----------------------------------------------------------------------------
-- Root cause: the function accepted `_role` from the client with only a
-- NOT-IN validation, so a caller could pass 'ADMIN' and promote themselves.
-- Fix: clamp to non-privileged roles for self-onboarding, and refuse to
-- downgrade any pre-existing ADMIN/ANALYST row.
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  _user_id uuid,
  _system_access text,
  _role text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _existing_role text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _system_access NOT IN ('ERP','EDU') THEN
    RAISE EXCEPTION 'invalid system access';
  END IF;

  -- Self-onboarding can only request non-privileged roles. ADMIN/ANALYST
  -- must be granted by an existing admin via the approval flow.
  IF _role NOT IN ('VIEWER','ESTUDANTE','PROFESSOR') THEN
    RAISE EXCEPTION 'invalid role for self-onboarding';
  END IF;

  SELECT org_id INTO _org_id FROM public.profiles WHERE user_id = _user_id;
  IF _org_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET system_access = _system_access::public.system_access_type,
         pending_approval = true,
         approval_requested_at = COALESCE(approval_requested_at, now()),
         updated_at = now()
   WHERE user_id = _user_id;

  -- Don't overwrite an existing privileged role (e.g. admin already granted
  -- ADMIN/ANALYST out-of-band) with the self-requested role.
  SELECT role::text INTO _existing_role
    FROM public.user_roles
   WHERE user_id = _user_id AND org_id = _org_id;

  IF _existing_role IN ('ADMIN','ANALYST') THEN
    RETURN true;
  END IF;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::public.user_role)
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN true;
END;
$$;

-- -----------------------------------------------------------------------------
-- Finding #4 [CRITICAL]: anon role can write system_health_checks and
-- test_flow_registry
-- -----------------------------------------------------------------------------
-- Root cause: policies named "Service..." target TO anon (i.e. the
-- unauthenticated PostgREST role) with USING/WITH CHECK (true). Fix: drop
-- them — service_role already bypasses RLS, so nothing legitimate relied on
-- these policies.
DROP POLICY IF EXISTS "Service can insert health checks"  ON public.system_health_checks;
DROP POLICY IF EXISTS "Service can update health checks"  ON public.system_health_checks;
DROP POLICY IF EXISTS "Service insert test registry"      ON public.test_flow_registry;
DROP POLICY IF EXISTS "Service insert sync log"           ON public.test_registry_sync_log;

-- -----------------------------------------------------------------------------
-- Finding #5 [HIGH]: demo-mode writes leak into the shared demo org
-- -----------------------------------------------------------------------------
-- Root cause: the enterprise_profiles policies use
-- `org_id = get_effective_org_id()` for INSERT/UPDATE/DELETE, which resolves
-- to the shared demo org when viewing_demo_org_id is set. Any admin in demo
-- mode can corrupt demo data for every other tenant.
DROP POLICY IF EXISTS "Users can create enterprise profiles in their effective org" ON public.enterprise_profiles;
DROP POLICY IF EXISTS "Users can update enterprise profiles in their effective org" ON public.enterprise_profiles;
DROP POLICY IF EXISTS "Users can delete enterprise profiles in their effective org" ON public.enterprise_profiles;

CREATE POLICY "Users can create enterprise profiles in their real org"
  ON public.enterprise_profiles FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update enterprise profiles in their real org"
  ON public.enterprise_profiles FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can delete enterprise profiles in their real org"
  ON public.enterprise_profiles FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));
-- SELECT policy stays as-is: reading via get_effective_org_id() is correct
-- because demo mode is meant to let you *view* demo data.

-- -----------------------------------------------------------------------------
-- Finding #6 [HIGH]: has_role is org-agnostic
-- -----------------------------------------------------------------------------
-- Apply has_role_in_org to the worst offenders flagged in the audit. (This is
-- intentionally narrow — wiring the new helper everywhere would touch dozens
-- of policies and risk lockouts. Remaining sites can be addressed in a
-- follow-up.)

-- lms_courses: manage by org admin only
DROP POLICY IF EXISTS "Admins can manage courses" ON public.lms_courses;
CREATE POLICY "Admins can manage courses in their org"
  ON public.lms_courses FOR ALL TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id)
  );

-- lms_tracks: manage by org admin only
DROP POLICY IF EXISTS "Admins can manage tracks" ON public.lms_tracks;
CREATE POLICY "Admins can manage tracks in their org"
  ON public.lms_tracks FOR ALL TO authenticated
  USING (
    org_id IS NOT NULL
    AND public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id)
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id)
  );

-- licenses: org-scoped admin management
DROP POLICY IF EXISTS "Admins can manage licenses" ON public.licenses;
CREATE POLICY "Org admins can manage licenses in their org"
  ON public.licenses FOR ALL TO authenticated
  USING (
    public.is_sistur_admin(auth.uid())
    OR (org_id IS NOT NULL
        AND public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id))
  )
  WITH CHECK (
    public.is_sistur_admin(auth.uid())
    OR (org_id IS NOT NULL
        AND public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id))
  );

-- -----------------------------------------------------------------------------
-- Finding #7 [HIGH]: missing WITH CHECK on UPDATE allows org_id / user_id
-- tampering
-- -----------------------------------------------------------------------------

-- forum_posts: pin author + org on update
DROP POLICY IF EXISTS "Users can update their own posts" ON public.forum_posts;
CREATE POLICY "Users can update their own posts"
  ON public.forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (visibility = 'public' OR public.user_belongs_to_org(auth.uid(), org_id))
  );

-- projects + children: add WITH CHECK so org_id can't be moved
DROP POLICY IF EXISTS "Users can update projects in their org" ON public.projects;
CREATE POLICY "Users can update projects in their org"
  ON public.projects FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage phases of projects in their org" ON public.project_phases;
CREATE POLICY "Users can manage phases of projects in their org"
  ON public.project_phases FOR ALL TO authenticated
  USING (project_id IN (
    SELECT id FROM public.projects
     WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())))
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects
     WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can manage tasks of projects in their org" ON public.project_tasks;
CREATE POLICY "Users can manage tasks of projects in their org"
  ON public.project_tasks FOR ALL TO authenticated
  USING (project_id IN (
    SELECT id FROM public.projects
     WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())))
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects
     WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can manage milestones of projects in their org" ON public.project_milestones;
CREATE POLICY "Users can manage milestones of projects in their org"
  ON public.project_milestones FOR ALL TO authenticated
  USING (project_id IN (
    SELECT id FROM public.projects
     WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())))
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects
     WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

-- lms_user_profiles: prevent self-promotion. RLS can't pin specific columns,
-- so revoke UPDATE broadly and grant only the safe subset. Admin paths use
-- the existing "Admins can manage LMS profiles in their org" policy which
-- continues to work under definer/service contexts.
REVOKE UPDATE ON public.lms_user_profiles FROM authenticated;
GRANT  UPDATE (status, updated_at) ON public.lms_user_profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update their own LMS profile" ON public.lms_user_profiles;
CREATE POLICY "Users can update their own LMS profile"
  ON public.lms_user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- lms_enrollments: pin user_id + course_id on update
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.lms_enrollments;
CREATE POLICY "Users can update their own enrollments"
  ON public.lms_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Finding #8 [HIGH]: destination_certifications FOR ALL for any org member
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Org members can manage certifications" ON public.destination_certifications;

CREATE POLICY "Org members can view certifications"
  ON public.destination_certifications FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Org admins & analysts manage certifications"
  ON public.destination_certifications FOR ALL TO authenticated
  USING (
    public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id)
    OR public.has_role_in_org(auth.uid(), 'ANALYST'::public.app_role, org_id)
  )
  WITH CHECK (
    public.has_role_in_org(auth.uid(), 'ADMIN'::public.app_role, org_id)
    OR public.has_role_in_org(auth.uid(), 'ANALYST'::public.app_role, org_id)
  );

-- -----------------------------------------------------------------------------
-- Finding #9 [MEDIUM]: USING (true) SELECT on edu junction tables
-- -----------------------------------------------------------------------------
-- Mirror the parent's org gate so unrelated orgs can't enumerate courseware.

DROP POLICY IF EXISTS "Users can view edu modules" ON public.edu_modules;
CREATE POLICY "Users can view edu modules"
  ON public.edu_modules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.edu_courses c
     WHERE c.id = edu_modules.course_id
       AND (c.org_id IS NULL OR public.user_belongs_to_org(auth.uid(), c.org_id))
  ));

DROP POLICY IF EXISTS "Users can view edu module lives" ON public.edu_module_lives;
CREATE POLICY "Users can view edu module lives"
  ON public.edu_module_lives FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.edu_modules m
      JOIN public.edu_courses c ON c.id = m.course_id
     WHERE m.id = edu_module_lives.module_id
       AND (c.org_id IS NULL OR public.user_belongs_to_org(auth.uid(), c.org_id))
  ));

DROP POLICY IF EXISTS "Users can view edu track courses" ON public.edu_track_courses;
CREATE POLICY "Users can view edu track courses"
  ON public.edu_track_courses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.edu_tracks t
     WHERE t.id = edu_track_courses.track_id
       AND (t.org_id IS NULL OR public.user_belongs_to_org(auth.uid(), t.org_id))
  ));

DROP POLICY IF EXISTS "Users can view edu track trainings" ON public.edu_track_trainings;
CREATE POLICY "Users can view edu track trainings"
  ON public.edu_track_trainings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.edu_tracks t
     WHERE t.id = edu_track_trainings.track_id
       AND (t.org_id IS NULL OR public.user_belongs_to_org(auth.uid(), t.org_id))
  ));

-- indicator_course_map / indicator_live_map are platform-global
-- (no org_id on either side): keep readable but require authentication so
-- unauthenticated enumeration is blocked.
DROP POLICY IF EXISTS "Users can view indicator course map" ON public.indicator_course_map;
CREATE POLICY "Users can view indicator course map"
  ON public.indicator_course_map FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view indicator live map" ON public.indicator_live_map;
CREATE POLICY "Users can view indicator live map"
  ON public.indicator_live_map FOR SELECT TO authenticated
  USING (true);
