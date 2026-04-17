-- ============================================================
-- MST Caches: TSE turnout & Anatel connectivity coverage
-- ============================================================

-- 1) TSE turnout cache (electoral participation %)
CREATE TABLE IF NOT EXISTS public.tse_turnout_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code TEXT NOT NULL,
  election_year INTEGER NOT NULL,
  turnout_pct NUMERIC(5,2) NOT NULL CHECK (turnout_pct >= 0 AND turnout_pct <= 100),
  source TEXT DEFAULT 'TSE — dadosabertos.tse.jus.br',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, election_year)
);

CREATE INDEX IF NOT EXISTS idx_tse_turnout_ibge ON public.tse_turnout_cache(ibge_code);
CREATE INDEX IF NOT EXISTS idx_tse_turnout_year ON public.tse_turnout_cache(election_year DESC);

ALTER TABLE public.tse_turnout_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tse_turnout_cache_select_all_auth"
  ON public.tse_turnout_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tse_turnout_cache_admin_write"
  ON public.tse_turnout_cache FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "tse_turnout_cache_admin_update"
  ON public.tse_turnout_cache FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "tse_turnout_cache_admin_delete"
  ON public.tse_turnout_cache FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER trg_tse_turnout_cache_updated_at
  BEFORE UPDATE ON public.tse_turnout_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Anatel coverage cache (5G/4G/Wi-Fi public)
CREATE TABLE IF NOT EXISTS public.anatel_coverage_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code TEXT NOT NULL,
  reference_year INTEGER NOT NULL,
  coverage_5g_pct NUMERIC(5,2) DEFAULT 0 CHECK (coverage_5g_pct >= 0 AND coverage_5g_pct <= 100),
  coverage_4g_pct NUMERIC(5,2) DEFAULT 0 CHECK (coverage_4g_pct >= 0 AND coverage_4g_pct <= 100),
  wifi_public_score NUMERIC(5,2) DEFAULT 0 CHECK (wifi_public_score >= 0 AND wifi_public_score <= 100),
  source TEXT DEFAULT 'Anatel — dados.anatel.gov.br (Mosaico)',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, reference_year)
);

CREATE INDEX IF NOT EXISTS idx_anatel_coverage_ibge ON public.anatel_coverage_cache(ibge_code);
CREATE INDEX IF NOT EXISTS idx_anatel_coverage_year ON public.anatel_coverage_cache(reference_year DESC);

ALTER TABLE public.anatel_coverage_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anatel_coverage_cache_select_all_auth"
  ON public.anatel_coverage_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "anatel_coverage_cache_admin_write"
  ON public.anatel_coverage_cache FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "anatel_coverage_cache_admin_update"
  ON public.anatel_coverage_cache FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "anatel_coverage_cache_admin_delete"
  ON public.anatel_coverage_cache FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER trg_anatel_coverage_cache_updated_at
  BEFORE UPDATE ON public.anatel_coverage_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed with top tourism municipalities (TSE 2022 turnout + Anatel 2024 estimate)
INSERT INTO public.tse_turnout_cache (ibge_code, election_year, turnout_pct, notes) VALUES
  ('3304557', 2022, 78.36, 'Rio de Janeiro/RJ'),
  ('3550308', 2022, 80.12, 'São Paulo/SP'),
  ('5300108', 2022, 81.45, 'Brasília/DF'),
  ('2927408', 2022, 79.83, 'Salvador/BA'),
  ('2611606', 2022, 78.92, 'Recife/PE'),
  ('4106902', 2022, 84.21, 'Curitiba/PR'),
  ('4205407', 2022, 82.17, 'Florianópolis/SC'),
  ('2304400', 2022, 77.65, 'Fortaleza/CE'),
  ('1501402', 2022, 76.43, 'Belém/PA'),
  ('5208707', 2022, 78.94, 'Goiânia/GO'),
  ('3170206', 2022, 80.05, 'Uberlândia/MG'),
  ('4314902', 2022, 83.71, 'Porto Alegre/RS'),
  ('2611101', 2022, 79.23, 'Olinda/PE'),
  ('4108304', 2022, 84.55, 'Foz do Iguaçu/PR'),
  ('3543402', 2022, 82.78, 'Ribeirão Preto/SP')
ON CONFLICT (ibge_code, election_year) DO NOTHING;

INSERT INTO public.anatel_coverage_cache (ibge_code, reference_year, coverage_5g_pct, coverage_4g_pct, wifi_public_score, notes) VALUES
  ('3304557', 2024, 92.5, 99.8, 75.0, 'Rio de Janeiro/RJ — capital metropolitana, alta densidade'),
  ('3550308', 2024, 95.2, 99.9, 80.0, 'São Paulo/SP — capital metropolitana, alta densidade'),
  ('5300108', 2024, 88.7, 99.5, 70.0, 'Brasília/DF — capital federal'),
  ('2927408', 2024, 70.3, 98.2, 55.0, 'Salvador/BA — capital nordeste'),
  ('2611606', 2024, 68.5, 97.8, 50.0, 'Recife/PE — capital nordeste'),
  ('4106902', 2024, 82.4, 99.5, 65.0, 'Curitiba/PR — capital sul'),
  ('4205407', 2024, 75.6, 98.9, 60.0, 'Florianópolis/SC — capital turística'),
  ('2304400', 2024, 65.2, 96.7, 45.0, 'Fortaleza/CE — capital nordeste'),
  ('1501402', 2024, 35.8, 85.4, 25.0, 'Belém/PA — capital norte'),
  ('5208707', 2024, 70.1, 97.3, 50.0, 'Goiânia/GO — capital centro-oeste'),
  ('3170206', 2024, 60.5, 96.2, 40.0, 'Uberlândia/MG — interior MG'),
  ('4314902', 2024, 85.3, 99.4, 70.0, 'Porto Alegre/RS — capital sul'),
  ('2611101', 2024, 55.7, 95.8, 35.0, 'Olinda/PE — destino histórico'),
  ('4108304', 2024, 78.9, 98.7, 65.0, 'Foz do Iguaçu/PR — destino turístico premium'),
  ('3543402', 2024, 72.4, 98.1, 55.0, 'Ribeirão Preto/SP — interior SP')
ON CONFLICT (ibge_code, reference_year) DO NOTHING;