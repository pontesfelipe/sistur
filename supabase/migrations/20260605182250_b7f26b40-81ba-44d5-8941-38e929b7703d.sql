
CREATE TABLE public.municipal_socioeconomic_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL,
  reference_year integer NOT NULL,
  population integer,
  pib_total_brl numeric,
  pib_per_capita_brl numeric,
  source text NOT NULL DEFAULT 'IBGE/SIDRA',
  source_tables jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, reference_year)
);

GRANT SELECT ON public.municipal_socioeconomic_context TO authenticated;
GRANT ALL ON public.municipal_socioeconomic_context TO service_role;

ALTER TABLE public.municipal_socioeconomic_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read municipal context"
  ON public.municipal_socioeconomic_context
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages municipal context"
  ON public.municipal_socioeconomic_context
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_msc_ibge ON public.municipal_socioeconomic_context (ibge_code);

CREATE TRIGGER update_msc_updated_at
  BEFORE UPDATE ON public.municipal_socioeconomic_context
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
