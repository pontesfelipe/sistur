-- Overview agregado das turmas do professor logado
CREATE OR REPLACE FUNCTION public.get_professor_classroom_overview(p_professor_id uuid DEFAULT NULL)
RETURNS TABLE (
  classroom_id uuid,
  classroom_name text,
  students_count integer,
  avg_total_xp numeric,
  active_streaks integer,
  at_risk_count integer,
  avg_exam_score numeric,
  completion_rate numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof uuid := COALESCE(p_professor_id, auth.uid());
BEGIN
  IF v_prof IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Apenas o próprio professor ou admin
  IF v_prof <> auth.uid() AND NOT has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.id AS cid, c.name
    FROM classrooms c
    WHERE c.professor_id = v_prof AND c.status = 'active'
  ),
  members AS (
    SELECT cs.classroom_id, cs.student_id
    FROM classroom_students cs
    WHERE cs.classroom_id IN (SELECT cid FROM base)
  ),
  xp AS (
    SELECT m.classroom_id,
           AVG(COALESCE(x.total_xp, 0))::numeric AS avg_xp,
           COUNT(*) FILTER (
             WHERE x.last_activity_date >= CURRENT_DATE - INTERVAL '1 day'
                AND COALESCE(x.current_streak,0) > 0
           )::int AS streaks,
           COUNT(*) FILTER (
             WHERE COALESCE(x.last_activity_date, DATE '1970-01-01') < CURRENT_DATE - INTERVAL '7 days'
           )::int AS at_risk
    FROM members m
    LEFT JOIN edu_user_xp x ON x.user_id = m.student_id
    GROUP BY m.classroom_id
  ),
  exams AS (
    SELECT m.classroom_id, AVG(ea.score_pct)::numeric AS avg_score
    FROM members m
    LEFT JOIN exam_attempts ea
      ON ea.user_id = m.student_id AND ea.submitted_at IS NOT NULL
    GROUP BY m.classroom_id
  ),
  completions AS (
    SELECT m.classroom_id,
           COUNT(DISTINCT m.student_id)::numeric AS total,
           COUNT(DISTINCT dp.user_id) FILTER (WHERE dp.completed_at IS NOT NULL)::numeric AS finished
    FROM members m
    LEFT JOIN edu_detailed_progress dp ON dp.user_id = m.student_id
    GROUP BY m.classroom_id
  )
  SELECT
    b.cid,
    b.name,
    (SELECT COUNT(*)::int FROM members WHERE classroom_id = b.cid),
    COALESCE(xp.avg_xp, 0),
    COALESCE(xp.streaks, 0),
    COALESCE(xp.at_risk, 0),
    COALESCE(exams.avg_score, 0),
    CASE WHEN COALESCE(c.total,0) = 0 THEN 0
         ELSE ROUND((c.finished / c.total) * 100, 1)
    END
  FROM base b
  LEFT JOIN xp ON xp.classroom_id = b.cid
  LEFT JOIN exams ON exams.classroom_id = b.cid
  LEFT JOIN completions c ON c.classroom_id = b.cid
  ORDER BY COALESCE(xp.avg_xp, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_professor_classroom_overview(uuid) TO authenticated;

-- Ranking org-wide para admins
CREATE OR REPLACE FUNCTION public.get_org_classroom_ranking()
RETURNS TABLE (
  classroom_id uuid,
  classroom_name text,
  professor_id uuid,
  professor_name text,
  students_count integer,
  avg_total_xp numeric,
  active_streaks integer,
  at_risk_count integer,
  avg_exam_score numeric,
  completion_rate numeric,
  rank integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ORG_ADMIN'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.id AS cid, c.name, c.professor_id
    FROM classrooms c
    WHERE c.status = 'active'
  ),
  members AS (
    SELECT cs.classroom_id, cs.student_id
    FROM classroom_students cs
    WHERE cs.classroom_id IN (SELECT cid FROM base)
  ),
  xp AS (
    SELECT m.classroom_id,
           AVG(COALESCE(x.total_xp, 0))::numeric AS avg_xp,
           COUNT(*) FILTER (
             WHERE x.last_activity_date >= CURRENT_DATE - INTERVAL '1 day'
                AND COALESCE(x.current_streak,0) > 0
           )::int AS streaks,
           COUNT(*) FILTER (
             WHERE COALESCE(x.last_activity_date, DATE '1970-01-01') < CURRENT_DATE - INTERVAL '7 days'
           )::int AS at_risk
    FROM members m
    LEFT JOIN edu_user_xp x ON x.user_id = m.student_id
    GROUP BY m.classroom_id
  ),
  exams AS (
    SELECT m.classroom_id, AVG(ea.score_pct)::numeric AS avg_score
    FROM members m
    LEFT JOIN exam_attempts ea
      ON ea.user_id = m.student_id AND ea.submitted_at IS NOT NULL
    GROUP BY m.classroom_id
  ),
  completions AS (
    SELECT m.classroom_id,
           COUNT(DISTINCT m.student_id)::numeric AS total,
           COUNT(DISTINCT dp.user_id) FILTER (WHERE dp.completed_at IS NOT NULL)::numeric AS finished
    FROM members m
    LEFT JOIN edu_detailed_progress dp ON dp.user_id = m.student_id
    GROUP BY m.classroom_id
  ),
  joined AS (
    SELECT
      b.cid,
      b.name,
      b.professor_id,
      COALESCE(p.full_name, p.email, 'Professor') AS prof_name,
      (SELECT COUNT(*)::int FROM members WHERE classroom_id = b.cid) AS sc,
      COALESCE(xp.avg_xp, 0) AS avg_xp,
      COALESCE(xp.streaks, 0) AS streaks,
      COALESCE(xp.at_risk, 0) AS at_risk,
      COALESCE(exams.avg_score, 0) AS avg_score,
      CASE WHEN COALESCE(c.total,0) = 0 THEN 0
           ELSE ROUND((c.finished / c.total) * 100, 1)
      END AS comp_rate
    FROM base b
    LEFT JOIN profiles p ON p.id = b.professor_id
    LEFT JOIN xp ON xp.classroom_id = b.cid
    LEFT JOIN exams ON exams.classroom_id = b.cid
    LEFT JOIN completions c ON c.classroom_id = b.cid
  )
  SELECT
    cid,
    name,
    professor_id,
    prof_name,
    sc,
    avg_xp,
    streaks,
    at_risk,
    avg_score,
    comp_rate,
    (RANK() OVER (ORDER BY avg_xp DESC, comp_rate DESC))::int
  FROM joined
  ORDER BY avg_xp DESC, comp_rate DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_classroom_ranking() TO authenticated;