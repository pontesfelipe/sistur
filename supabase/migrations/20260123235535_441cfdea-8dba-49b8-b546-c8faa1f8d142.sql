
-- Add training_id column to prescriptions table for unified EDU model
ALTER TABLE public.prescriptions 
ADD COLUMN IF NOT EXISTS training_id TEXT;

-- Add training_id column to recommendations table for unified EDU model  
ALTER TABLE public.recommendations 
ADD COLUMN IF NOT EXISTS training_id TEXT;

-- Make course_id nullable since we now can use training_id instead
ALTER TABLE public.prescriptions 
ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.recommendations 
ALTER COLUMN course_id DROP NOT NULL;

-- Add index for training_id lookups
CREATE INDEX IF NOT EXISTS idx_prescriptions_training_id ON public.prescriptions(training_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_training_id ON public.recommendations(training_id);

-- Add comment for clarity
COMMENT ON COLUMN public.prescriptions.training_id IS 'Reference to edu_trainings.training_id for unified EDU model';
COMMENT ON COLUMN public.recommendations.training_id IS 'Reference to edu_trainings.training_id for unified EDU model';
