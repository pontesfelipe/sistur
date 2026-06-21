ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS air_connectivity_analysis jsonb,
  ADD COLUMN IF NOT EXISTS tariff_seasonality_analysis jsonb;