-- Add diagnostic_type column to assessments table
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS diagnostic_type TEXT DEFAULT 'territorial' CHECK (diagnostic_type IN ('territorial', 'enterprise'));

-- Add index for filtering by diagnostic type
CREATE INDEX IF NOT EXISTS idx_assessments_diagnostic_type ON public.assessments(diagnostic_type);

-- Comment for documentation
COMMENT ON COLUMN public.assessments.diagnostic_type IS 'Type of diagnostic: territorial (public sector, municipalities) or enterprise (private sector, hotels/resorts)';