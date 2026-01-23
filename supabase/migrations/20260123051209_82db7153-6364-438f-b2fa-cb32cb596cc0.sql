-- Add indicator_scope column to indicators table
-- Values: 'territorial' (público), 'enterprise' (hoteleiro), 'both' (ambos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'indicator_scope_type') THEN
    CREATE TYPE indicator_scope_type AS ENUM ('territorial', 'enterprise', 'both');
  END IF;
END$$;

ALTER TABLE public.indicators 
ADD COLUMN IF NOT EXISTS indicator_scope indicator_scope_type DEFAULT 'territorial';

-- Update existing indicators based on source
-- IGMA indicators are typically territorial
UPDATE public.indicators 
SET indicator_scope = 'territorial' 
WHERE indicator_scope IS NULL;

-- Add has_territorial_access column to orgs table
ALTER TABLE public.orgs 
ADD COLUMN IF NOT EXISTS has_territorial_access BOOLEAN DEFAULT true;

-- Update existing organizations: PUBLIC orgs have territorial access, all keep their enterprise access
UPDATE public.orgs 
SET has_territorial_access = true 
WHERE has_territorial_access IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.indicators.indicator_scope IS 'Escopo do indicador: territorial (público), enterprise (hoteleiro), ou both (ambos)';
COMMENT ON COLUMN public.orgs.has_territorial_access IS 'Acesso a diagnósticos territoriais (públicos)';
COMMENT ON COLUMN public.orgs.has_enterprise_access IS 'Acesso a diagnósticos enterprise (hoteleiros)';