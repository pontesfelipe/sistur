
-- 1. classrooms: allow enrolled students to read their classroom
CREATE POLICY "Enrolled students can view classroom"
ON public.classrooms FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.classroom_students cs
  WHERE cs.classroom_id = classrooms.id AND cs.student_id = auth.uid()
));

-- 2. exam_attempts: ensure null user_id rows are not readable
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can manage their own attempts" ON public.exam_attempts;
CREATE POLICY "Users can view their own attempts"
ON public.exam_attempts FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Users can manage their own attempts"
ON public.exam_attempts FOR ALL
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid())
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- 3. forum_post_likes: org-scoped SELECT
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.forum_post_likes;
CREATE POLICY "Authenticated users can view post likes"
ON public.forum_post_likes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_posts fp
  WHERE fp.id = forum_post_likes.post_id
    AND (fp.visibility = 'public' OR user_belongs_to_org(auth.uid(), fp.org_id))
));

-- 4. forum_reply_likes: org-scoped SELECT
DROP POLICY IF EXISTS "Authenticated users can view reply likes" ON public.forum_reply_likes;
CREATE POLICY "Authenticated users can view reply likes"
ON public.forum_reply_likes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_replies fr
  JOIN public.forum_posts fp ON fp.id = fr.post_id
  WHERE fr.id = forum_reply_likes.reply_id
    AND (fp.visibility = 'public' OR user_belongs_to_org(auth.uid(), fp.org_id))
));

-- 5. edu_learning_sessions: restrict IP/user_agent access to owner + ADMIN only
DROP POLICY IF EXISTS "Users can view own sessions" ON public.edu_learning_sessions;
CREATE POLICY "Users can view own sessions"
ON public.edu_learning_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'ADMIN'::app_role));

-- 6. terms_acceptance: remove ORG_ADMIN access to PII (IP, user_agent)
DROP POLICY IF EXISTS "Org admins can read same-org terms acceptance" ON public.terms_acceptance;
