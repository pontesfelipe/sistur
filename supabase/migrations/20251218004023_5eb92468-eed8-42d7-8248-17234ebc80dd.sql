-- Create table to track user progress on trainings
CREATE TABLE IF NOT EXISTS public.user_training_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.edu_tracks(id) ON DELETE CASCADE,
  training_id text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT user_training_progress_unique UNIQUE (user_id, track_id, training_id)
);

-- Enable RLS
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see and manage their own progress
CREATE POLICY "Users can view their own progress" 
ON public.user_training_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON public.user_training_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" 
ON public.user_training_progress 
FOR DELETE 
USING (auth.uid() = user_id);