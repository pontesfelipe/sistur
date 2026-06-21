
INSERT INTO public.enterprise_indicators (code, name, category_id, pillar, unit, description, collection_frequency, benchmark_min, benchmark_max, benchmark_target, weight, is_active, minimum_tier)
VALUES
  ('ENT_CONECTIVIDADE_TELECOM', 'Conectividade Telecom (4G/5G/Fibra)',
    '4f0f5f08-56af-4f6d-ad6c-8d020629a0ad', 'OE', 'score 0-100',
    'Composto de cobertura 4G, 5G e Wi-Fi público no município (Anatel). Indica facilidade de uso de PMS, OTAs e check-in mobile pelo hóspede.',
    'anual', 0, 100, 70, 1.0, true, 'SMALL'),
  ('ENT_ACESSIBILIDADE_SCORE', 'Acessibilidade Urbana do Entorno',
    '4f0f5f08-56af-4f6d-ad6c-8d020629a0ad', 'OE', 'score 0-100',
    'Avaliação de calçadas, rampas, sinalização tátil e atrativos turísticos acessíveis no entorno do empreendimento.',
    'anual', 0, 100, 60, 0.8, true, 'MEDIUM'),
  ('ENT_SAUDE_ENTORNO', 'Infraestrutura de Saúde do Entorno',
    '4f0f5f08-56af-4f6d-ad6c-8d020629a0ad', 'OE', 'score 0-100',
    'Disponibilidade de hospitais, leitos e pronto-socorro próximos ao empreendimento (DATASUS/CNES). Mitiga risco de incidentes com hóspedes.',
    'anual', 0, 100, 60, 0.8, true, 'MEDIUM')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  benchmark_min = EXCLUDED.benchmark_min,
  benchmark_max = EXCLUDED.benchmark_max,
  benchmark_target = EXCLUDED.benchmark_target,
  is_active = true,
  updated_at = now();

ALTER TABLE public.enterprise_profiles
  ADD COLUMN IF NOT EXISTS telecom_coverage_analysis jsonb,
  ADD COLUMN IF NOT EXISTS urban_accessibility_analysis jsonb,
  ADD COLUMN IF NOT EXISTS health_infrastructure_analysis jsonb;

CREATE TABLE IF NOT EXISTS public.datasus_health_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL UNIQUE,
  reference_year integer,
  total_establishments integer,
  total_hospitals integer,
  total_beds integer,
  emergency_units integer,
  beds_per_1k_inhabitants numeric,
  has_24h_emergency boolean,
  source text DEFAULT 'DATASUS/CNES',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.datasus_health_cache TO authenticated;
GRANT SELECT ON public.datasus_health_cache TO anon;
GRANT ALL ON public.datasus_health_cache TO service_role;

ALTER TABLE public.datasus_health_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "datasus_health_cache_read_all" ON public.datasus_health_cache;
CREATE POLICY "datasus_health_cache_read_all"
  ON public.datasus_health_cache FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "datasus_health_cache_service_write" ON public.datasus_health_cache;
CREATE POLICY "datasus_health_cache_service_write"
  ON public.datasus_health_cache FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_datasus_health_cache_ibge ON public.datasus_health_cache(ibge_code);
