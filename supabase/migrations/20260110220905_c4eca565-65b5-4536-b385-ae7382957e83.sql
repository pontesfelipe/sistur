-- Add ingestion tracking columns to edu_trainings
ALTER TABLE public.edu_trainings 
ADD COLUMN IF NOT EXISTS ingestion_source TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ingestion_confidence NUMERIC(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ingestion_metadata JSONB DEFAULT NULL;

-- Create index for filtering imported content
CREATE INDEX IF NOT EXISTS idx_edu_trainings_ingestion_source ON public.edu_trainings(ingestion_source) WHERE ingestion_source IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.edu_trainings.ingestion_source IS 'Source of import: youtube_rss, youtube_api, catalog_json, etc.';
COMMENT ON COLUMN public.edu_trainings.ingestion_confidence IS 'Confidence score of auto-classification (0.00-1.00)';
COMMENT ON COLUMN public.edu_trainings.ingestion_metadata IS 'Additional metadata from ingestion: youtube_id, channel, etc.';