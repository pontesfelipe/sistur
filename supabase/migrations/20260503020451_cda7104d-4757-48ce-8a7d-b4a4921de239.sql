CREATE TABLE public.course_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id TEXT NOT NULL REFERENCES public.edu_trainings(training_id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  org_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','closed')),
  reply_count INT NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_discussions_training ON public.course_discussions(training_id);
CREATE INDEX idx_course_discussions_created ON public.course_discussions(created_at DESC);
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discussions visible to authenticated"
ON public.course_discussions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated create discussions"
ON public.course_discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author or instructor update discussions"
ON public.course_discussions FOR UPDATE TO authenticated USING (
  auth.uid() = author_id
  OR has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.edu_trainings t WHERE t.training_id = course_discussions.training_id AND t.created_by = auth.uid())
);

CREATE POLICY "Author or instructor delete discussions"
ON public.course_discussions FOR DELETE TO authenticated USING (
  auth.uid() = author_id
  OR has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.edu_trainings t WHERE t.training_id = course_discussions.training_id AND t.created_by = auth.uid())
);

CREATE TRIGGER trg_course_discussions_updated_at
BEFORE UPDATE ON public.course_discussions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_discussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.course_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  is_instructor_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_discussion_replies_disc ON public.course_discussion_replies(discussion_id);
ALTER TABLE public.course_discussion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies visible to authenticated"
ON public.course_discussion_replies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated reply"
ON public.course_discussion_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author or instructor update replies"
ON public.course_discussion_replies FOR UPDATE TO authenticated USING (
  auth.uid() = author_id
  OR has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.course_discussions cd
    JOIN public.edu_trainings t ON t.training_id = cd.training_id
    WHERE cd.id = course_discussion_replies.discussion_id AND t.created_by = auth.uid()
  )
);

CREATE POLICY "Author or instructor delete replies"
ON public.course_discussion_replies FOR DELETE TO authenticated USING (
  auth.uid() = author_id
  OR has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.course_discussions cd
    JOIN public.edu_trainings t ON t.training_id = cd.training_id
    WHERE cd.id = course_discussion_replies.discussion_id AND t.created_by = auth.uid()
  )
);

CREATE TRIGGER trg_course_discussion_replies_updated_at
BEFORE UPDATE ON public.course_discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_discussion_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.course_discussions SET reply_count = reply_count + 1, updated_at = now() WHERE id = NEW.discussion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.course_discussions SET reply_count = GREATEST(reply_count - 1, 0), updated_at = now() WHERE id = OLD.discussion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_discussion_reply_count
AFTER INSERT OR DELETE ON public.course_discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.update_discussion_reply_count();

CREATE TABLE public.edu_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  body TEXT NOT NULL,
  context_training_id TEXT,
  context_classroom_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_edu_messages_sender ON public.edu_messages(sender_id, created_at DESC);
CREATE INDEX idx_edu_messages_recipient ON public.edu_messages(recipient_id, created_at DESC);
CREATE INDEX idx_edu_messages_unread ON public.edu_messages(recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.edu_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own messages"
ON public.edu_messages FOR SELECT TO authenticated USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id OR has_role(auth.uid(), 'ADMIN'::app_role)
);
CREATE POLICY "Send as self"
ON public.edu_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipient marks read"
ON public.edu_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Sender admin delete"
ON public.edu_messages FOR DELETE TO authenticated USING (
  auth.uid() = sender_id OR has_role(auth.uid(), 'ADMIN'::app_role)
);