ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS demand_trends_analysis jsonb,
  ADD COLUMN IF NOT EXISTS consolidated_reputation_analysis jsonb,
  ADD COLUMN IF NOT EXISTS social_media_analysis jsonb;