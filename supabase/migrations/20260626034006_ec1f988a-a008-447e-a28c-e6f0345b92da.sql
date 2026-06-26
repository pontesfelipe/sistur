
DROP POLICY IF EXISTS "Anyone can view quiz options" ON public.quiz_options;
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON public.quiz_questions;

CREATE POLICY "Authenticated users can view quiz options"
  ON public.quiz_options
  FOR SELECT
  TO authenticated
  USING (quiz_id IN (SELECT quiz_id FROM public.quiz_questions WHERE is_active = true));

CREATE POLICY "Authenticated users can view active quizzes"
  ON public.quiz_questions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

REVOKE SELECT ON public.quiz_options FROM anon;
REVOKE SELECT ON public.quiz_questions FROM anon;
