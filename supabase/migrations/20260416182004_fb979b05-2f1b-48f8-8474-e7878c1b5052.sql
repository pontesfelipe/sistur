-- ============================================
-- TRACK EXAMS BY PILLAR
-- ============================================
-- Allows a track to have one final exam per pillar covered by its trainings.
-- Each (track_id, pillar) maps to one exam_ruleset (config) used to generate
-- on-demand exams for users.
-- ============================================

-- 1. Allow exam_rulesets.course_id to be nullable (already nullable per schema).
--    Add an optional pillar column so a ruleset not tied to a course still
--    knows which pillar to draw questions from.
ALTER TABLE public.exam_rulesets
  ADD COLUMN IF NOT EXISTS pillar TEXT
    CHECK (pillar IS NULL OR pillar IN ('RA', 'OE', 'AO'));

-- 2. Add track_id + pillar to exams for traceability when the exam was
--    generated from a track context (course_id may be NULL).
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES public.edu_tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pillar TEXT
    CHECK (pillar IS NULL OR pillar IN ('RA', 'OE', 'AO'));

CREATE INDEX IF NOT EXISTS idx_exams_track_id ON public.exams(track_id);

-- 3. Bridge table: track <-> ruleset per pillar
CREATE TABLE IF NOT EXISTS public.edu_track_exam_rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.edu_tracks(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  ruleset_id UUID NOT NULL REFERENCES public.exam_rulesets(ruleset_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_track_exam_rulesets_track ON public.edu_track_exam_rulesets(track_id);

ALTER TABLE public.edu_track_exam_rulesets ENABLE ROW LEVEL SECURITY;

-- RLS: anyone authenticated can read (provas estão disponíveis a usuários da trilha)
DROP POLICY IF EXISTS "Anyone can view track exam rulesets" ON public.edu_track_exam_rulesets;
CREATE POLICY "Anyone can view track exam rulesets"
ON public.edu_track_exam_rulesets FOR SELECT
TO authenticated
USING (true);

-- RLS: only ADMINs (global) or org admins of the track's org can mutate
DROP POLICY IF EXISTS "Admins can manage track exam rulesets" ON public.edu_track_exam_rulesets;
CREATE POLICY "Admins can manage track exam rulesets"
ON public.edu_track_exam_rulesets FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.edu_tracks t
    WHERE t.id = edu_track_exam_rulesets.track_id
      AND (t.org_id IS NULL OR has_role_in_org(auth.uid(), t.org_id, 'ORG_ADMIN'::app_role))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.edu_tracks t
    WHERE t.id = edu_track_exam_rulesets.track_id
      AND (t.org_id IS NULL OR has_role_in_org(auth.uid(), t.org_id, 'ORG_ADMIN'::app_role))
  )
);

-- 4. RPC to generate (or re-generate) exam rulesets per pillar for a track.
--    Returns the array of pillars for which rulesets were created/already existed.
CREATE OR REPLACE FUNCTION public.generate_track_exam_rulesets(
  p_track_id UUID,
  p_question_count INT DEFAULT 20,
  p_min_score_pct NUMERIC DEFAULT 70,
  p_time_limit_minutes INT DEFAULT 60,
  p_max_attempts INT DEFAULT 2,
  p_overwrite BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(pillar TEXT, ruleset_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_pillar TEXT;
  v_existing_id UUID;
  v_new_ruleset_id UUID;
BEGIN
  -- Authorization: must be ADMIN or org admin of the track's org
  SELECT org_id INTO v_org_id
  FROM public.edu_tracks WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'track_not_found';
  END IF;

  IF NOT has_role(auth.uid(), 'ADMIN'::app_role)
     AND (v_org_id IS NULL OR NOT has_role_in_org(auth.uid(), v_org_id, 'ORG_ADMIN'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- For each distinct pillar present in the track's trainings
  FOR v_pillar IN
    SELECT DISTINCT t.pillar
    FROM public.edu_track_trainings tt
    JOIN public.edu_trainings t ON t.training_id = tt.training_id
    WHERE tt.track_id = p_track_id
      AND t.pillar IN ('RA', 'OE', 'AO')
  LOOP
    SELECT etr.ruleset_id INTO v_existing_id
    FROM public.edu_track_exam_rulesets etr
    WHERE etr.track_id = p_track_id AND etr.pillar = v_pillar;

    IF v_existing_id IS NOT NULL AND NOT p_overwrite THEN
      pillar := v_pillar;
      ruleset_id := v_existing_id;
      created := FALSE;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- If overwriting, drop the old link (ruleset is cascaded)
    IF v_existing_id IS NOT NULL AND p_overwrite THEN
      DELETE FROM public.edu_track_exam_rulesets
      WHERE track_id = p_track_id AND pillar = v_pillar;
    END IF;

    -- Create new ruleset (course_id NULL — track-scoped)
    INSERT INTO public.exam_rulesets (
      course_id, pillar, min_score_pct, time_limit_minutes,
      question_count, allow_retake, retake_wait_hours,
      max_attempts, min_days_between_same_quiz
    ) VALUES (
      NULL, v_pillar, p_min_score_pct, p_time_limit_minutes,
      p_question_count, TRUE, 24,
      p_max_attempts, 7
    ) RETURNING exam_rulesets.ruleset_id INTO v_new_ruleset_id;

    INSERT INTO public.edu_track_exam_rulesets (track_id, pillar, ruleset_id)
    VALUES (p_track_id, v_pillar, v_new_ruleset_id);

    pillar := v_pillar;
    ruleset_id := v_new_ruleset_id;
    created := TRUE;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 5. Backfill: create default exam rulesets for all existing active tracks
--    that have at least one training and don't have a ruleset for that pillar yet.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT t.id AS track_id, tr.pillar
    FROM public.edu_tracks t
    JOIN public.edu_track_trainings tt ON tt.track_id = t.id
    JOIN public.edu_trainings tr ON tr.training_id = tt.training_id
    WHERE COALESCE(t.active, true) = true
      AND tr.pillar IN ('RA', 'OE', 'AO')
      AND NOT EXISTS (
        SELECT 1 FROM public.edu_track_exam_rulesets etr
        WHERE etr.track_id = t.id AND etr.pillar = tr.pillar
      )
  LOOP
    DECLARE
      v_new_ruleset_id UUID;
    BEGIN
      INSERT INTO public.exam_rulesets (
        course_id, pillar, min_score_pct, time_limit_minutes,
        question_count, allow_retake, retake_wait_hours,
        max_attempts, min_days_between_same_quiz
      ) VALUES (
        NULL, r.pillar, 70, 60,
        20, TRUE, 24,
        2, 7
      ) RETURNING ruleset_id INTO v_new_ruleset_id;

      INSERT INTO public.edu_track_exam_rulesets (track_id, pillar, ruleset_id)
      VALUES (r.track_id, r.pillar, v_new_ruleset_id);
    END;
  END LOOP;
END $$;