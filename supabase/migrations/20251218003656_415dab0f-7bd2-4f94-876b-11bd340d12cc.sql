-- Create table to link tracks with trainings (edu_trainings)
CREATE TABLE IF NOT EXISTS public.edu_track_trainings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.edu_tracks(id) ON DELETE CASCADE,
  training_id text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint
ALTER TABLE public.edu_track_trainings 
ADD CONSTRAINT edu_track_trainings_track_training_unique UNIQUE (track_id, training_id);

-- Enable RLS
ALTER TABLE public.edu_track_trainings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view edu track trainings" 
ON public.edu_track_trainings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage edu track trainings" 
ON public.edu_track_trainings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM edu_tracks t
    WHERE t.id = edu_track_trainings.track_id 
    AND t.org_id IS NOT NULL 
    AND user_belongs_to_org(auth.uid(), t.org_id) 
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  )
);