
-- Cache mensal CADÚNICO por município (alimentado via API SAGI Solr)
CREATE TABLE IF NOT EXISTS public.cadunico_municipio_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ibge_code_6 TEXT NOT NULL,
  ibge_code_7 TEXT,
  municipio TEXT,
  uf TEXT,
  anomes TEXT NOT NULL,
  reference_year INTEGER NOT NULL,
  reference_month INTEGER NOT NULL,
  total_familias_cadastradas INTEGER,
  total_pessoas_cadastradas INTEGER,
  familias_baixa_renda INTEGER,
  pessoas_baixa_renda INTEGER,
  familias_extrema_pobreza INTEGER,
  populacao_referencia INTEGER,
  pct_pop_baixa_renda NUMERIC(6,2),
  data_source_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cadunico_cache_unique_ibge UNIQUE (ibge_code_6)
);

CREATE INDEX IF NOT EXISTS idx_cadunico_cache_ibge6 ON public.cadunico_municipio_cache (ibge_code_6);
CREATE INDEX IF NOT EXISTS idx_cadunico_cache_ibge7 ON public.cadunico_municipio_cache (ibge_code_7);
CREATE INDEX IF NOT EXISTS idx_cadunico_cache_anomes ON public.cadunico_municipio_cache (anomes DESC);

ALTER TABLE public.cadunico_municipio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadunico_cache_select_authenticated"
  ON public.cadunico_municipio_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "cadunico_cache_admin_all"
  ON public.cadunico_municipio_cache FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Histórico de execuções
CREATE TABLE IF NOT EXISTS public.cadunico_ingestion_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT,
  reference_anomes TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  rows_processed INTEGER,
  municipalities_updated INTEGER,
  bytes_downloaded BIGINT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

ALTER TABLE public.cadunico_ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadunico_runs_admin_select"
  ON public.cadunico_ingestion_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Trigger updated_at
CREATE TRIGGER cadunico_cache_set_updated_at
  BEFORE UPDATE ON public.cadunico_municipio_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
