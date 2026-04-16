-- Add FK from recommendations.training_id to edu_trainings.training_id
ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_training_id_fkey
  FOREIGN KEY (training_id) REFERENCES public.edu_trainings(training_id)
  ON DELETE SET NULL;