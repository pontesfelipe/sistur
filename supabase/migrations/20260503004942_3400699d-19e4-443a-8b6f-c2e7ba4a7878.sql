
-- 1) Campos de plano de ensino em edu_trainings
ALTER TABLE public.edu_trainings
  ADD COLUMN IF NOT EXISTS ementa text,
  ADD COLUMN IF NOT EXISTS competencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS habilidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS carga_horaria_teorica integer,
  ADD COLUMN IF NOT EXISTS carga_horaria_pratica integer,
  ADD COLUMN IF NOT EXISTS bibliografia_basica jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bibliografia_complementar jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metodologia text,
  ADD COLUMN IF NOT EXISTS criterios_avaliacao text,
  ADD COLUMN IF NOT EXISTS prerequisitos jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.edu_trainings.competencias IS 'Lista de competências desenvolvidas pelo curso';
COMMENT ON COLUMN public.edu_trainings.habilidades IS 'Lista de habilidades específicas (Bloom)';
COMMENT ON COLUMN public.edu_trainings.bibliografia_basica IS 'Array de objetos {autor, titulo, ano, link?}';
COMMENT ON COLUMN public.edu_trainings.prerequisitos IS 'Array de training_ids que devem ser concluídos antes';

-- 2) Função histórico escolar (boletim)
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
    (SELECT MAX(ea.score_pct)
       FROM exam_attempts ea
       JOIN exams ex ON ex.exam_id = ea.exam_id
      WHERE ea.user_id = p_user_id
        AND ex.training_id = t.training_id) AS best_score,
    (SELECT COUNT(*)::int
       FROM exam_attempts ea
       JOIN exams ex ON ex.exam_id = ea.exam_id
      WHERE ea.user_id = p_user_id
        AND ex.training_id = t.training_id) AS attempts_count,
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
    AND (p.user_id = p_user_id OR EXISTS (
      SELECT 1 FROM exam_attempts ea
      JOIN exams ex ON ex.exam_id = ea.exam_id
      WHERE ea.user_id = p_user_id AND ex.training_id = t.training_id
    ))
  ORDER BY p.completed_at DESC NULLS LAST, p.started_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_transcript(uuid) TO authenticated;
