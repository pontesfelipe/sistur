CREATE TABLE public.pf_international_arrivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf text NOT NULL,
  reference_year int NOT NULL,
  reference_month int NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  via text NOT NULL DEFAULT 'TOTAL',
  arrivals int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uf, reference_year, reference_month, via)
);
GRANT SELECT ON public.pf_international_arrivals TO authenticated;
GRANT ALL ON public.pf_international_arrivals TO service_role;
ALTER TABLE public.pf_international_arrivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read pf arrivals" ON public.pf_international_arrivals FOR SELECT TO authenticated USING (true);

CREATE TABLE public.inmet_climate_normals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code text NOT NULL,
  ibge_code text,
  uf text,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  temp_media_c numeric,
  temp_max_c numeric,
  temp_min_c numeric,
  precipitacao_mm numeric,
  period text NOT NULL DEFAULT '1991-2020',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_code, month, period)
);
GRANT SELECT ON public.inmet_climate_normals TO authenticated;
GRANT ALL ON public.inmet_climate_normals TO service_role;
ALTER TABLE public.inmet_climate_normals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read inmet normals" ON public.inmet_climate_normals FOR SELECT TO authenticated USING (true);

INSERT INTO public.external_data_sources (code, name, description, trust_level_default, update_frequency, active) VALUES
('PF_STI', 'Polícia Federal / MTur — Chegadas internacionais', 'Chegadas de turistas internacionais por UF, mês e via de acesso.', 5, 'MENSAL', true),
('INMET', 'INMET — Normais Climatológicas', 'Temperatura e precipitação mensais por estação (normais 1991-2020).', 5, 'ANUAL', true)
ON CONFLICT DO NOTHING;