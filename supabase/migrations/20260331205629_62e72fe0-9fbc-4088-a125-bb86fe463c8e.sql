-- Add is_ignored and ignore_reason columns to indicator_values
ALTER TABLE public.indicator_values
ADD COLUMN is_ignored BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN ignore_reason TEXT;

-- Add index for quick filtering of non-ignored values during calculation
CREATE INDEX idx_indicator_values_not_ignored 
ON public.indicator_values (assessment_id) 
WHERE is_ignored = false;