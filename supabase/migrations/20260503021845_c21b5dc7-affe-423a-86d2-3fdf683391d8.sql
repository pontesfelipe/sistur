CREATE TABLE public.classroom_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_classroom_announcements_room ON public.classroom_announcements(classroom_id, created_at DESC);
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor students admin view announcements"
ON public.classroom_announcements FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.classroom_id AND c.professor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.classroom_students s WHERE s.classroom_id = classroom_announcements.classroom_id AND s.student_id = auth.uid())
);

CREATE POLICY "Professor admin insert announcements"
ON public.classroom_announcements FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = author_id AND (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.classroom_id AND c.professor_id = auth.uid())
  )
);

CREATE POLICY "Professor admin update announcements"
ON public.classroom_announcements FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.classroom_id AND c.professor_id = auth.uid())
);

CREATE POLICY "Professor admin delete announcements"
ON public.classroom_announcements FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.classroom_id AND c.professor_id = auth.uid())
);

CREATE TRIGGER trg_classroom_announcements_updated_at
BEFORE UPDATE ON public.classroom_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();