-- Fix get_student_transcript: it referenced exams.training_id, a column that does
-- not exist (exams are keyed to lms_courses.course_id, uuid), so every call failed
-- with "column ex.training_id does not exist" and /edu/boletim never loaded.
-- There is no bridge between exams/lms_courses and edu_trainings today, so exam
-- scores cannot be attributed per training; attempts now come from
-- edu_progress.attempts and best_score is null until a mapping exists.
CREATE OR REPLACE FUNCTION public.get_student_transcript(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  training_id text,
  course_title text,
  pillar text,
  curriculum_level integer,
  duration_minutes integer,
  status text,
  progress_percent integer,
  started_at timestamptz,
  completed_at timestamptz,
  best_score numeric,
  attempts_count integer,
  certificate_id text,
  certificate_issued_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permissão: o próprio usuário ou ADMIN/ORG_ADMIN/PROFESSOR da mesma org
  IF p_user_id <> auth.uid()
     AND NOT has_role(auth.uid(), 'ADMIN'::app_role)
     AND NOT (
       has_role(auth.uid(), 'ORG_ADMIN'::app_role)
       OR has_role(auth.uid(), 'PROFESSOR'::app_role)
     )
  THEN
    RAISE EXCEPTION 'Acesso negado ao histórico escolar';
  END IF;

  RETURN QUERY
  SELECT
    t.training_id,
    t.title,
    t.pillar,
    t.curriculum_level,
    t.duration_minutes,
    CASE
      WHEN p.completed_at IS NOT NULL THEN 'concluido'
      WHEN p.progress_percent > 0 THEN 'em_andamento'
      ELSE 'nao_iniciado'
    END::text AS status,
    COALESCE(p.progress_percent, 0),
    p.started_at,
    p.completed_at,
    NULL::numeric AS best_score,
    COALESCE(p.attempts, 0)::int AS attempts_count,
    c.certificate_id,
    c.issued_at
  FROM edu_trainings t
  LEFT JOIN edu_progress p
    ON p.training_id = t.training_id
   AND p.user_id = p_user_id
  LEFT JOIN certificates c
    ON c.training_id = t.training_id
   AND c.user_id = p_user_id
   AND c.status = 'active'
  WHERE t.active = true
    AND (
      p.id IS NOT NULL
      OR c.certificate_id IS NOT NULL
    )
  ORDER BY p.completed_at DESC NULLS LAST, p.started_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_transcript(uuid) TO authenticated;