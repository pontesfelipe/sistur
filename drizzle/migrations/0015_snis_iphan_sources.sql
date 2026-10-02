CREATE TABLE public.snis_sanitation_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL,
  reference_year int NOT NULL,
  agua_cobertura_pct numeric,
  esgoto_coleta_pct numeric,
  esgoto_tratamento_pct numeric,
  residuos_coleta_pct numeric,
  perdas_agua_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, reference_year)
);
GRANT SELECT ON public.snis_sanitation_indicators TO authenticated;
GRANT ALL ON public.snis_sanitation_indicators TO service_role;
ALTER TABLE public.snis_sanitation_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read snis" ON public.snis_sanitation_indicators FOR SELECT TO authenticated USING (true);

CREATE TABLE public.iphan_heritage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ibge_code text NOT NULL,
  asset_name text NOT NULL,
  asset_type text,
  protection_level text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ibge_code, asset_name)
);
GRANT SELECT ON public.iphan_heritage_assets TO authenticated;
GRANT ALL ON public.iphan_heritage_assets TO service_role;
ALTER TABLE public.iphan_heritage_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read iphan" ON public.iphan_heritage_assets FOR SELECT TO authenticated USING (true);

INSERT INTO public.external_data_sources (code, name, description, trust_level_default, update_frequency, active) VALUES
('SNIS', 'SNIS/SINISA — Ministério das Cidades', 'Cobertura de água, coleta e tratamento de esgoto, coleta de resíduos e perdas de água por município.', 5, 'ANUAL', true),
('IPHAN', 'IPHAN/SICG — Patrimônio Cultural', 'Bens tombados, registrados e protegidos por município.', 5, 'ANUAL', true)
ON CONFLICT DO NOTHING;