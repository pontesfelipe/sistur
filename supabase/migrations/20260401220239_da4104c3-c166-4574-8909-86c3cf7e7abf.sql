
ALTER TABLE public.generated_reports
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'personal',
ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';

COMMENT ON COLUMN public.generated_reports.visibility IS 'personal = only creator sees it, org = all org members see it';
COMMENT ON COLUMN public.generated_reports.environment IS 'production or demo';
