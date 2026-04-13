
-- Table for Mapa do Turismo Brasileiro data (regiões turísticas + categorização)
CREATE TABLE public.mapa_turismo_municipios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ibge_code TEXT,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  regiao_turistica TEXT,
  macrorregiao TEXT,
  categoria TEXT, -- A, B, C, D, E or 'Turístico', 'Complementar', 'Apoio'
  municipality_type TEXT, -- 'turistico', 'complementar', 'apoio'
  ano_referencia INTEGER NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'dados.turismo.gov.br',
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups by IBGE code and municipality name
CREATE INDEX idx_mapa_turismo_ibge ON public.mapa_turismo_municipios (ibge_code);
CREATE INDEX idx_mapa_turismo_uf_mun ON public.mapa_turismo_municipios (uf, municipio);
CREATE INDEX idx_mapa_turismo_ano ON public.mapa_turismo_municipios (ano_referencia DESC);

-- RLS
ALTER TABLE public.mapa_turismo_municipios ENABLE ROW LEVEL SECURITY;

-- Public read (reference data)
CREATE POLICY "Anyone can read tourism map data"
  ON public.mapa_turismo_municipios FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage tourism map data"
  ON public.mapa_turismo_municipios FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Ingestion log
CREATE TABLE public.mapa_turismo_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'mapa_turismo', 'categorizacao'
  ano_referencia INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error'
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.mapa_turismo_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read sync logs"
  ON public.mapa_turismo_sync_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Service can insert sync logs"
  ON public.mapa_turismo_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
