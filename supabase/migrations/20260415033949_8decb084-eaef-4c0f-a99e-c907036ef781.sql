ALTER TABLE public.enterprise_profiles
ADD COLUMN IF NOT EXISTS review_analysis JSONB DEFAULT NULL;