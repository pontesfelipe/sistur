
CREATE OR REPLACE FUNCTION public.list_message_contacts()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,           -- 'professor' | 'student' | 'colega'
  classroom_id uuid,
  classroom_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT auth.uid() AS uid,
           (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()) AS my_org
  )
  -- Professors of my classrooms (when I'm a student)
  SELECT DISTINCT ON (c.professor_id)
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
  SELECT DISTINCT ON (cs2.student_id)
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
  SELECT DISTINCT ON (cs.student_id)
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

  UNION
  -- Members of the same organization (not pending, not in default orgs)
  SELECT DISTINCT ON (p.user_id)
    p.user_id,
    COALESCE(p.full_name,'Usuário') AS full_name,
    'colega'::text AS role,
    NULL::uuid AS classroom_id,
    COALESCE(o.name,'Organização') AS classroom_name
  FROM public.profiles p
  LEFT JOIN public.orgs o ON o.id = p.org_id
  WHERE p.user_id <> (SELECT uid FROM me)
    AND p.org_id IS NOT NULL
    AND COALESCE(p.pending_approval, false) = false
    AND COALESCE(o.name,'') NOT IN ('Autônomo','Temporário')
    AND (
      p.org_id = (SELECT my_org FROM me)
      OR has_role((SELECT uid FROM me),'ADMIN'::app_role)
    )
  ORDER BY 2;
$$;
