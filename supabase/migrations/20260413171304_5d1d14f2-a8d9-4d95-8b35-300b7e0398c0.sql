-- Add MAPA_TURISMO as an external data source
INSERT INTO public.external_data_sources (code, name, description, update_frequency, trust_level_default, active)
VALUES ('MAPA_TURISMO', 'Mapa do Turismo Brasileiro', 'Categorização e regionalização oficial dos municípios turísticos do Brasil (Ministério do Turismo)', 'annual', 4, true)
ON CONFLICT (code) DO NOTHING;

-- Create indicator for Categoria no Mapa do Turismo
INSERT INTO public.indicators (code, name, pillar, theme, description, unit, direction, normalization, min_ref, max_ref, weight, data_source, collection_type, source, minimum_tier, indicator_scope, notes)
VALUES (
  'igma_categoria_mapa_turismo',
  'Categoria no Mapa do Turismo',
  'AO',
  'Infraestrutura e Serviços Turísticos',
  'Categoria oficial do município no Mapa do Turismo Brasileiro (A=5, B=4, C=3, D=2, E=1). Indica o nível de desenvolvimento turístico reconhecido pelo Ministério do Turismo.',
  'categoria',
  'HIGH_IS_BETTER',
  'MIN_MAX',
  1,
  5,
  1.0,
  'MAPA_TURISMO',
  'AUTOMATICA',
  'IGMA',
  'SMALL',
  'territorial',
  'Valor numérico derivado da categoria: A=5, B=4, C=3, D=2, E=1. Pré-preenchido automaticamente via dados do Mapa do Turismo.'
)
ON CONFLICT (code) DO NOTHING;

-- Create indicator for Região Turística
INSERT INTO public.indicators (code, name, pillar, theme, description, unit, direction, normalization, min_ref, max_ref, weight, data_source, collection_type, source, minimum_tier, indicator_scope, notes)
VALUES (
  'igma_regiao_turistica',
  'Pertence a Região Turística',
  'AO',
  'Infraestrutura e Serviços Turísticos',
  'Indica se o município está mapeado em uma região turística oficial (1=Sim, 0=Não).',
  'binário',
  'HIGH_IS_BETTER',
  'BINARY',
  0,
  1,
  0.5,
  'MAPA_TURISMO',
  'AUTOMATICA',
  'IGMA',
  'SMALL',
  'territorial',
  'Valor binário: 1 se o município possui região turística mapeada, 0 caso contrário. Pré-preenchido automaticamente.'
)
ON CONFLICT (code) DO NOTHING;

-- Add index on ibge_code for faster pre-fill lookups
CREATE INDEX IF NOT EXISTS idx_mapa_turismo_ibge_code ON public.mapa_turismo_municipios (ibge_code) WHERE ibge_code IS NOT NULL;