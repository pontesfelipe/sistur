-- Diário de Classe consolidado: agrega presença (sessões/heartbeats), progresso em atividades e notas em exames por aluno em uma sala.

CREATE OR REPLACE FUNCTION public.get_classroom_diary(p_classroom_id uuid)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  enrolled_at timestamptz,
  total_sessions bigint,
  attendance_days bigint,
  total_active_minutes bigint,
  last_seen_at timestamptz,
  assignments_total bigint,
  assignments_completed bigint,
  best_exam_score numeric,
  exam_attempts bigint,
  fraud_flags bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_professor uuid;
  v_org uuid;
BEGIN
  SELECT professor_id, NULL::uuid INTO v_professor, v_org
  FROM public.classrooms WHERE id = p_classroom_id;

  IF v_professor IS NULL THEN
    RAISE EXCEPTION 'Classroom not found';
  END IF;

  -- Permissão: dono da sala, ADMIN ou ORG_ADMIN
  IF v_uid <> v_professor
     AND NOT public.has_role(v_uid, 'ADMIN'::public.app_role)
     AND NOT public.has_role(v_uid, 'ORG_ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT cs.student_id, cs.enrolled_at,
           COALESCE(p.full_name, 'Estudante') AS student_name
    FROM public.classroom_students cs
    LEFT JOIN public.profiles p ON p.user_id = cs.student_id
    WHERE cs.classroom_id = p_classroom_id
  ),
  sess AS (
    SELECT s.user_id,
           COUNT(*) AS total_sessions,
           COUNT(DISTINCT date_trunc('day', s.started_at)) AS attendance_days,
           COALESCE(SUM(s.active_seconds), 0) / 60 AS total_active_minutes,
           MAX(GREATEST(s.last_heartbeat_at, COALESCE(s.ended_at, s.last_heartbeat_at))) AS last_seen_at
    FROM public.edu_learning_sessions s
    WHERE s.user_id IN (SELECT student_id FROM members)
    GROUP BY s.user_id
  ),
  asg AS (
    SELECT a.id
    FROM public.classroom_assignments a
    WHERE a.classroom_id = p_classroom_id
  ),
  asg_progress AS (
    SELECT m.student_id,
           (SELECT COUNT(*) FROM asg) AS assignments_total,
           COALESCE((
             SELECT COUNT(*) FROM public.assignment_progress ap
             WHERE ap.user_id = m.student_id
               AND ap.assignment_id IN (SELECT id FROM asg)
               AND ap.status = 'completed'
           ), 0) AS assignments_completed
    FROM members m
  ),
  exams AS (
    SELECT ea.user_id,
           MAX(ea.score_pct) AS best_exam_score,
           COUNT(*) AS exam_attempts
    FROM public.exam_attempts ea
    WHERE ea.user_id IN (SELECT student_id FROM members)
    GROUP BY ea.user_id
  ),
  flags AS (
    SELECT f.user_id, COUNT(*) AS fraud_flags
    FROM public.edu_fraud_flags f
    WHERE f.user_id IN (SELECT student_id FROM members)
      AND f.status = 'pending'
    GROUP BY f.user_id
  )
  SELECT
    m.student_id,
    m.student_name,
    m.enrolled_at,
    COALESCE(s.total_sessions, 0)::bigint,
    COALESCE(s.attendance_days, 0)::bigint,
    COALESCE(s.total_active_minutes, 0)::bigint,
    s.last_seen_at,
    COALESCE(ap.assignments_total, 0)::bigint,
    COALESCE(ap.assignments_completed, 0)::bigint,
    e.best_exam_score,
    COALESCE(e.exam_attempts, 0)::bigint,
    COALESCE(f.fraud_flags, 0)::bigint
  FROM members m
  LEFT JOIN sess s ON s.user_id = m.student_id
  LEFT JOIN asg_progress ap ON ap.student_id = m.student_id
  LEFT JOIN exams e ON e.user_id = m.student_id
  LEFT JOIN flags f ON f.user_id = m.student_id
  ORDER BY m.student_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_classroom_diary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_classroom_diary(uuid) TO authenticated;