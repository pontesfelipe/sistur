-- Dedupe destinations within an org. Cross-org duplicates remain (multi-tenant isolation).
CREATE UNIQUE INDEX IF NOT EXISTS destinations_org_ibge_unique
  ON public.destinations (org_id, ibge_code)
  WHERE ibge_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS destinations_org_name_uf_unique
  ON public.destinations (org_id, lower(trim(name)), uf)
  WHERE name IS NOT NULL AND uf IS NOT NULL;