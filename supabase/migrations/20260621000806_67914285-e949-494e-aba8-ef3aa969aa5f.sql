ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS cnpj_data jsonb,
  ADD COLUMN IF NOT EXISTS context_analysis jsonb,
  ADD COLUMN IF NOT EXISTS complaints_analysis jsonb;