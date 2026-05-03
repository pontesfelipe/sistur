ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS rubric jsonb DEFAULT NULL;

COMMENT ON COLUMN public.quiz_questions.rubric IS
  'Rubrica de avaliação para questões dissertativas. Formato: { criteria: [{ name, max_points, descriptors[] }], total_max_points, visible_to_student }';