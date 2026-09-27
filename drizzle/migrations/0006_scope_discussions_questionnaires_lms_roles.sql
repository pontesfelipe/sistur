DROP POLICY IF EXISTS "Discussions visible to authenticated" ON public.course_discussions;
CREATE POLICY "Discussions visible within org" ON public.course_discussions FOR SELECT TO authenticated
USING (org_id IS NULL OR org_id = public.get_effective_org_id() OR author_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Replies visible to authenticated" ON public.course_discussion_replies;
CREATE POLICY "Replies visible within org" ON public.course_discussion_replies FOR SELECT TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN') OR EXISTS (
  SELECT 1 FROM public.course_discussions d WHERE d.id = discussion_id
    AND (d.org_id IS NULL OR d.org_id = public.get_effective_org_id())));

DROP POLICY IF EXISTS "Questionnaires are viewable by authenticated users" ON public.questionnaires;
CREATE POLICY "Questionnaires visible within org" ON public.questionnaires FOR SELECT TO authenticated
USING (org_id IS NULL OR org_id = public.get_effective_org_id() OR public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Questionnaire questions are viewable by authenticated users" ON public.questionnaire_questions;
CREATE POLICY "Questionnaire questions visible within org" ON public.questionnaire_questions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN') OR EXISTS (
  SELECT 1 FROM public.questionnaires q WHERE q.questionnaire_id = questionnaire_questions.questionnaire_id
    AND (q.org_id IS NULL OR q.org_id = public.get_effective_org_id())));

DROP POLICY IF EXISTS "Anyone can view LMS roles" ON public.lms_roles;
CREATE POLICY "Admins can view LMS roles" ON public.lms_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));