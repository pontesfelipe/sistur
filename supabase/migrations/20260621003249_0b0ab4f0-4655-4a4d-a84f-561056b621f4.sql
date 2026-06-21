ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS events_analysis JSONB,
  ADD COLUMN IF NOT EXISTS safety_analysis JSONB;