ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS climate_analysis JSONB,
  ADD COLUMN IF NOT EXISTS transport_analysis JSONB,
  ADD COLUMN IF NOT EXISTS brand_strength_analysis JSONB;