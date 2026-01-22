-- 1) Remove duplicates (keep the most recent row per org/municipality/indicator)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id, municipality_ibge_code, indicator_code
      ORDER BY created_at DESC
    ) AS rn
  FROM public.external_indicator_values
)
DELETE FROM public.external_indicator_values e
USING ranked r
WHERE e.id = r.id
  AND r.rn > 1;

-- 2) Prevent future duplicates
ALTER TABLE public.external_indicator_values
ADD CONSTRAINT external_indicator_values_org_muni_indicator_uniq
UNIQUE (org_id, municipality_ibge_code, indicator_code);
