-- Opt-in leaderboard flag per student (default off, privacy-safe)
ALTER TABLE public.classroom_students
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false;

-- RPC: weekly leaderboard for a classroom (only opt-in members visible)
-- Returns aggregated XP earned in the last 7 days for opt-in students of the classroom.
CREATE OR REPLACE FUNCTION public.get_classroom_weekly_leaderboard(p_classroom_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  xp_week integer,
  total_xp integer,
  level integer,
  rank integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Access: must be the owning professor, ADMIN, or an opt-in student of the classroom
  IF NOT (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR owns_classroom(auth.uid(), p_classroom_id)
    OR EXISTS (
      SELECT 1 FROM public.classroom_students cs
      WHERE cs.classroom_id = p_classroom_id
        AND cs.student_id = auth.uid()
        AND cs.leaderboard_opt_in = true
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH week_xp AS (
    SELECT e.user_id, COALESCE(SUM(e.points), 0)::int AS xp_week
    FROM public.edu_xp_events e
    JOIN public.classroom_students cs
      ON cs.student_id = e.user_id
     AND cs.classroom_id = p_classroom_id
     AND cs.leaderboard_opt_in = true
    WHERE e.created_at >= now() - interval '7 days'
    GROUP BY e.user_id
  ),
  base AS (
    SELECT cs.student_id AS user_id,
           COALESCE(w.xp_week, 0) AS xp_week
    FROM public.classroom_students cs
    LEFT JOIN week_xp w ON w.user_id = cs.student_id
    WHERE cs.classroom_id = p_classroom_id
      AND cs.leaderboard_opt_in = true
  )
  SELECT
    b.user_id,
    COALESCE(p.full_name, 'Aluno') AS display_name,
    b.xp_week,
    COALESCE(x.total_xp, 0) AS total_xp,
    COALESCE(x.level, 1) AS level,
    RANK() OVER (ORDER BY b.xp_week DESC, COALESCE(x.total_xp,0) DESC)::int AS rank
  FROM base b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.edu_user_xp x ON x.user_id = b.user_id
  ORDER BY rank ASC
  LIMIT 50;
END;
$$;

-- Trigger: create in-app notification when a badge is awarded
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  SELECT title INTO v_title FROM public.edu_badges WHERE id = NEW.badge_id;
  INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.user_id,
    'badge_earned',
    'Nova conquista desbloqueada!',
    COALESCE('Você ganhou a badge: ' || v_title, 'Você ganhou uma nova badge'),
    '/edu/conquistas',
    jsonb_build_object('badge_id', NEW.badge_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_badge_earned ON public.edu_user_badges;
CREATE TRIGGER trg_notify_badge_earned
AFTER INSERT ON public.edu_user_badges
FOR EACH ROW
EXECUTE FUNCTION public.notify_badge_earned();