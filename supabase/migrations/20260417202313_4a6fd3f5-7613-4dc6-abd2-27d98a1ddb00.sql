
INSERT INTO public.external_data_sources (code, name, description, update_frequency, trust_level_default, active)
VALUES
  ('TSE', 'Tribunal Superior Eleitoral', 'Comparecimento eleitoral por município (extraído via Firecrawl a partir de fontes que sindicam dados oficiais do TSE).', 'BIENAL', 4, true),
  ('ANATEL', 'Agência Nacional de Telecomunicações', 'Cobertura 5G/4G por município (extraído via Firecrawl a partir do portal Teleco que republica dados oficiais da Anatel).', 'MENSAL', 4, true)
ON CONFLICT (code) DO NOTHING;
