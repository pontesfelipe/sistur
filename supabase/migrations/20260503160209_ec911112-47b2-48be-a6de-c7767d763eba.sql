
-- ============= Classroom calendar events =============
CREATE TABLE public.classroom_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'evento'
    CHECK (event_type IN ('aula','prova','prazo','reuniao','live','evento')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  link_url text,
  alarm_minutes_before int NOT NULL DEFAULT 60 CHECK (alarm_minutes_before >= 0),
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_classroom_events_classroom ON public.classroom_calendar_events(classroom_id);
CREATE INDEX idx_classroom_events_starts_at ON public.classroom_calendar_events(starts_at);

ALTER TABLE public.classroom_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage classroom events"
  ON public.classroom_calendar_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Professors manage own classroom events"
  ON public.classroom_calendar_events FOR ALL TO authenticated
  USING (owns_classroom(auth.uid(), classroom_id))
  WITH CHECK (owns_classroom(auth.uid(), classroom_id));

CREATE POLICY "Enrolled students see classroom events"
  ON public.classroom_calendar_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.classroom_id = classroom_calendar_events.classroom_id
      AND cs.student_id = auth.uid()
  ));

CREATE TRIGGER trg_update_classroom_events_updated
BEFORE UPDATE ON public.classroom_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify students when an event is created
CREATE OR REPLACE FUNCTION public.notify_classroom_event_students()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_classroom_name text;
BEGIN
  SELECT name INTO v_classroom_name FROM public.classrooms WHERE id = NEW.classroom_id;
  INSERT INTO public.edu_notifications (user_id, type, title, message, link, metadata)
  SELECT
    cs.student_id,
    'classroom_event',
    'Novo evento: ' || NEW.title,
    COALESCE(v_classroom_name,'Turma') || ' • ' || to_char(NEW.starts_at AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI'),
    '/edu/calendario',
    jsonb_build_object(
      'event_id', NEW.id,
      'classroom_id', NEW.classroom_id,
      'starts_at', NEW.starts_at,
      'alarm_minutes_before', NEW.alarm_minutes_before
    )
  FROM public.classroom_students cs
  WHERE cs.classroom_id = NEW.classroom_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_classroom_event_students
AFTER INSERT ON public.classroom_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.notify_classroom_event_students();

-- RPC: events visible for the current user (student/professor/admin)
CREATE OR REPLACE FUNCTION public.get_my_classroom_events(
  p_from timestamptz DEFAULT now() - interval '7 days',
  p_to   timestamptz DEFAULT now() + interval '120 days'
)
RETURNS TABLE (
  id uuid,
  classroom_id uuid,
  classroom_name text,
  professor_id uuid,
  professor_name text,
  title text,
  description text,
  event_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  link_url text,
  alarm_minutes_before int,
  color text,
  is_owner boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.id, e.classroom_id, c.name, e.professor_id, p.full_name,
    e.title, e.description, e.event_type, e.starts_at, e.ends_at,
    e.location, e.link_url, e.alarm_minutes_before, e.color,
    (e.professor_id = auth.uid() OR has_role(auth.uid(),'ADMIN'::app_role)) AS is_owner
  FROM public.classroom_calendar_events e
  JOIN public.classrooms c ON c.id = e.classroom_id
  LEFT JOIN public.profiles p ON p.user_id = e.professor_id
  WHERE e.starts_at BETWEEN p_from AND p_to
    AND (
      has_role(auth.uid(),'ADMIN'::app_role)
      OR e.professor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.classroom_students cs
        WHERE cs.classroom_id = e.classroom_id AND cs.student_id = auth.uid()
      )
    )
  ORDER BY e.starts_at;
$$;

-- ============= Messaging contacts =============
-- Returns the people the current user can start a conversation with:
--  • students see professors and classmates of every classroom they're in
--  • professors see students of every classroom they own
--  • admins see both sides for all classrooms
CREATE OR REPLACE FUNCTION public.list_message_contacts()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,           -- 'professor' | 'student'
  classroom_id uuid,
  classroom_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid)
  -- Professors of my classrooms (when I'm a student)
  SELECT DISTINCT ON (c.professor_id, c.id)
    c.professor_id AS user_id,
    COALESCE(p.full_name,'Professor') AS full_name,
    'professor'::text AS role,
    c.id AS classroom_id,
    c.name AS classroom_name
  FROM public.classroom_students cs
  JOIN public.classrooms c ON c.id = cs.classroom_id
  LEFT JOIN public.profiles p ON p.user_id = c.professor_id
  WHERE cs.student_id = (SELECT uid FROM me)
    AND c.professor_id <> (SELECT uid FROM me)
  UNION
  -- Classmates of my classrooms
  SELECT DISTINCT ON (cs2.student_id, cs.classroom_id)
    cs2.student_id AS user_id,
    COALESCE(p.full_name,'Aluno') AS full_name,
    'student'::text AS role,
    cs.classroom_id,
    c.name
  FROM public.classroom_students cs
  JOIN public.classroom_students cs2 ON cs2.classroom_id = cs.classroom_id
  JOIN public.classrooms c ON c.id = cs.classroom_id
  LEFT JOIN public.profiles p ON p.user_id = cs2.student_id
  WHERE cs.student_id = (SELECT uid FROM me)
    AND cs2.student_id <> (SELECT uid FROM me)
  UNION
  -- Students of classrooms I own (professor view) or all (admin)
  SELECT DISTINCT ON (cs.student_id, c.id)
    cs.student_id AS user_id,
    COALESCE(p.full_name,'Aluno') AS full_name,
    'student'::text AS role,
    c.id AS classroom_id,
    c.name AS classroom_name
  FROM public.classrooms c
  JOIN public.classroom_students cs ON cs.classroom_id = c.id
  LEFT JOIN public.profiles p ON p.user_id = cs.student_id
  WHERE (c.professor_id = (SELECT uid FROM me) OR has_role((SELECT uid FROM me),'ADMIN'::app_role))
    AND cs.student_id <> (SELECT uid FROM me)
  ORDER BY 2;
$$;
