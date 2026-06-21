ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS sustainability_analysis JSONB,
  ADD COLUMN IF NOT EXISTS pricing_analysis JSONB;