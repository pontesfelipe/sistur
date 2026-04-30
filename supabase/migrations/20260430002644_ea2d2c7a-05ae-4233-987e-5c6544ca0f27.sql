CREATE TABLE IF NOT EXISTS public.anac_air_connectivity (
  ibge_code TEXT PRIMARY KEY,
  municipality_name TEXT,
  uf TEXT,
  airport_icao_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  airport_count INTEGER DEFAULT 0,
  total_flights_12m BIGINT DEFAULT 0,
  domestic_flights_12m BIGINT DEFAULT 0,
  international_flights_12m BIGINT DEFAULT 0,
  total_passengers_12m BIGINT DEFAULT 0,
  domestic_passengers_12m BIGINT DEFAULT 0,
  international_passengers_12m BIGINT DEFAULT 0,
  flights_per_week NUMERIC GENERATED ALWAYS AS (ROUND(total_flights_12m::numeric / 52.0, 2)) STORED,
  reference_period_start DATE,
  reference_period_end DATE,
  data_source_url TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anac_connectivity_uf ON public.anac_air_connectivity (uf);
CREATE INDEX IF NOT EXISTS idx_anac_connectivity_fetched ON public.anac_air_connectivity (fetched_at);

ALTER TABLE public.anac_air_connectivity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anac_connectivity_authenticated_read"
  ON public.anac_air_connectivity
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "anac_connectivity_admin_write"
  ON public.anac_air_connectivity
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER trg_anac_connectivity_updated_at
  BEFORE UPDATE ON public.anac_air_connectivity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.anac_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  rows_processed BIGINT DEFAULT 0,
  municipalities_updated INTEGER DEFAULT 0,
  bytes_downloaded BIGINT DEFAULT 0,
  error_message TEXT,
  source_url TEXT
);

ALTER TABLE public.anac_ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anac_runs_admin_read"
  ON public.anac_ingestion_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));