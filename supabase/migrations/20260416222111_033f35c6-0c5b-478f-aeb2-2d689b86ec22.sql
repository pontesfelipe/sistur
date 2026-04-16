CREATE TYPE public.value_format_type AS ENUM (
  'PERCENTAGE',
  'RATIO',
  'INDEX_SCORE',
  'CURRENCY',
  'CURRENCY_THOUSANDS',
  'CURRENCY_MILLIONS',
  'COUNT',
  'RATE_PER_CAPITA',
  'DURATION',
  'AREA',
  'BINARY',
  'CATEGORICAL',
  'NUMERIC'
);

ALTER TABLE public.indicators
  ADD COLUMN value_format public.value_format_type;

COMMENT ON COLUMN public.indicators.value_format IS 'Categoria semântica do valor — usada por relatórios, dashboards e formulários para formatar números (porcentagens, moeda, contagem, etc.).';

UPDATE public.indicators SET value_format = (CASE
  WHEN unit IS NULL THEN 'NUMERIC'
  WHEN lower(unit) IN ('%') THEN 'PERCENTAGE'
  WHEN lower(unit) IN ('índice 0-1', 'indice 0-1') THEN 'RATIO'
  WHEN lower(unit) IN ('índice', 'indice', 'iqa', 'iqa (0-100)', 'score', 'score 1-5', 'score -100 a 100', 'nota', 'nota 0-10') THEN 'INDEX_SCORE'
  WHEN lower(unit) = 'r$' THEN 'CURRENCY'
  WHEN lower(unit) IN ('r$ (mil)', 'r$/aluno', 'r$/aluno/ponto', 'r$/hab.') THEN 'CURRENCY'
  WHEN lower(unit) = 'r$ mi' THEN 'CURRENCY_MILLIONS'
  WHEN lower(unit) IN ('por mil hab.', 'por 100 hab.', 'por 100 mil hab.', 'por mil nascidos') THEN 'RATE_PER_CAPITA'
  WHEN lower(unit) IN ('horas/ano', 'minutos', 'dias', 'anos') THEN 'DURATION'
  WHEN lower(unit) IN ('km²', 'hab./km²', 'focos/km²') THEN 'AREA'
  WHEN lower(unit) IN ('binário', 'binario', 'sim/não', 'sim/nao') THEN 'BINARY'
  WHEN lower(unit) IN ('categoria', 'nota a-d') THEN 'CATEGORICAL'
  WHEN lower(unit) IN ('unidades', 'unidade', 'un', 'eventos/ano', 'voos/sem', 'turistas/ano', 'segmentos', 'habitantes', 'l/hab./dia', 'l/hóspede/dia', 'kwh/uh/mês', 'tco₂eq/hab.') THEN 'COUNT'
  ELSE 'NUMERIC'
END)::public.value_format_type
WHERE value_format IS NULL;

ALTER TABLE public.indicators
  ALTER COLUMN value_format SET DEFAULT 'NUMERIC'::public.value_format_type;

ALTER TABLE public.indicators
  ALTER COLUMN value_format SET NOT NULL;