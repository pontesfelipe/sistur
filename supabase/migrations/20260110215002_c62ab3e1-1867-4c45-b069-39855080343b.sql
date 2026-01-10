-- SISEEDU Module Upgrade Migration
-- Extends edu_trainings and creates new tables for enrollments, progress, and events

-- 1. Add new columns to edu_trainings table
ALTER TABLE public.edu_trainings
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS objectives text,
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_provider text DEFAULT 'supabase' CHECK (video_provider IN ('supabase', 'mux', 'vimeo', 'youtube')),
ADD COLUMN IF NOT EXISTS video_asset jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS free_preview_seconds integer DEFAULT 0;

-- Create trigger for updated_at on edu_trainings
DROP TRIGGER IF EXISTS update_edu_trainings_updated_at ON public.edu_trainings;
CREATE TRIGGER update_edu_trainings_updated_at
  BEFORE UPDATE ON public.edu_trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create edu_enrollments table
CREATE TABLE IF NOT EXISTS public.edu_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id uuid NOT NULL REFERENCES public.edu_tracks(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trail_id)
);

-- Enable RLS on edu_enrollments
ALTER TABLE public.edu_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies for edu_enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.edu_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments"
  ON public.edu_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
  ON public.edu_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments in their org"
  ON public.edu_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_tracks t
      WHERE t.id = edu_enrollments.trail_id
      AND t.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), t.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

CREATE POLICY "Admins can manage all enrollments in their org"
  ON public.edu_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_tracks t
      WHERE t.id = edu_enrollments.trail_id
      AND t.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), t.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- 3. Create edu_progress table
CREATE TABLE IF NOT EXISTS public.edu_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id text NOT NULL,
  trail_id uuid REFERENCES public.edu_tracks(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_at timestamptz,
  watch_seconds integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id, trail_id)
);

-- Enable RLS on edu_progress
ALTER TABLE public.edu_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for edu_progress
CREATE POLICY "Users can view their own progress"
  ON public.edu_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
  ON public.edu_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.edu_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress in their org"
  ON public.edu_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_tracks t
      WHERE t.id = edu_progress.trail_id
      AND t.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), t.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- 4. Create edu_events table (analytics events)
CREATE TABLE IF NOT EXISTS public.edu_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id uuid REFERENCES public.edu_tracks(id) ON DELETE SET NULL,
  training_id text,
  event_type text NOT NULL,
  event_value jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_edu_events_user_id ON public.edu_events(user_id);
CREATE INDEX IF NOT EXISTS idx_edu_events_training_id ON public.edu_events(training_id);
CREATE INDEX IF NOT EXISTS idx_edu_events_created_at ON public.edu_events(created_at);
CREATE INDEX IF NOT EXISTS idx_edu_events_event_type ON public.edu_events(event_type);

-- Enable RLS on edu_events
ALTER TABLE public.edu_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for edu_events
CREATE POLICY "Users can view their own events"
  ON public.edu_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON public.edu_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all events in their org"
  ON public.edu_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.edu_tracks t
      WHERE t.id = edu_events.trail_id
      AND t.org_id IS NOT NULL
      AND user_belongs_to_org(auth.uid(), t.org_id)
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

-- 5. Create edu-videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'edu-videos',
  'edu-videos',
  false,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for edu-videos bucket
CREATE POLICY "Admins can upload videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'edu-videos'
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Admins can update videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'edu-videos'
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Admins can delete videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'edu-videos'
    AND has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE POLICY "Authenticated users can view videos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'edu-videos'
    AND auth.uid() IS NOT NULL
  );

-- 6. Add columns to edu_tracks for publishing workflow
ALTER TABLE public.edu_tracks
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Create trigger for updated_at on edu_tracks
DROP TRIGGER IF EXISTS update_edu_tracks_updated_at ON public.edu_tracks;
CREATE TRIGGER update_edu_tracks_updated_at
  BEFORE UPDATE ON public.edu_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Add unlock_rule and required columns to edu_track_trainings
ALTER TABLE public.edu_track_trainings
ADD COLUMN IF NOT EXISTS required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS unlock_rule jsonb DEFAULT '{}'::jsonb;