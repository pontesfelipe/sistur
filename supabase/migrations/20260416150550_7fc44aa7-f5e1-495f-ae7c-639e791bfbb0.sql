INSERT INTO public.external_data_sources (code, name, description, update_frequency, trust_level_default, active)
VALUES ('IBGE_CENSO', 'IBGE Censo Demográfico', 'Dados do Censo Demográfico via API SIDRA/IBGE (saneamento, abastecimento de água, coleta de lixo)', 'DECENNIAL', 5, true)
ON CONFLICT (code) DO NOTHING;