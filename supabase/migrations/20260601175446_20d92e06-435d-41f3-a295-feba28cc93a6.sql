INSERT INTO public.external_data_sources (code, name, description, trust_level_default, update_frequency, active)
VALUES
  ('CADUNICO', 'Cadastro Único (CADÚNICO)', 'Cadastro Único para Programas Sociais do Governo Federal - população de baixa renda', 5, 'MENSAL', true),
  ('ANAC', 'Agência Nacional de Aviação Civil', 'Conectividade aérea - voos por semana por município (cache mensal)', 5, 'MENSAL', true)
ON CONFLICT (code) DO NOTHING;