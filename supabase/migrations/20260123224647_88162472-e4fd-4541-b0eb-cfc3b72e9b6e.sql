-- =============================================================
-- UNIFICAÇÃO: Indicadores Enterprise → tabela indicators
-- =============================================================
-- 1. Adicionar campos faltantes na tabela indicators para suportar Enterprise
-- =============================================================

-- Campo para vincular a categoria Enterprise (se aplicável)
ALTER TABLE public.indicators 
ADD COLUMN IF NOT EXISTS enterprise_category_id UUID REFERENCES public.enterprise_indicator_categories(id);

-- Campos de benchmark (vindos de enterprise_indicators)
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS benchmark_min NUMERIC,
ADD COLUMN IF NOT EXISTS benchmark_max NUMERIC,
ADD COLUMN IF NOT EXISTS benchmark_target NUMERIC;

-- Campo collection_frequency (vindo de enterprise_indicators)
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS collection_frequency TEXT DEFAULT 'mensal';

-- =============================================================
-- 2. Migrar os 26 indicadores Enterprise para indicators
--    Usando cast correto para os enums existentes
-- =============================================================

INSERT INTO public.indicators (
  code,
  name,
  description,
  pillar,
  theme,
  direction,
  normalization,
  weight,
  minimum_tier,
  indicator_scope,
  enterprise_category_id,
  benchmark_min,
  benchmark_max,
  benchmark_target,
  collection_frequency,
  unit
)
SELECT
  ei.code,
  ei.name,
  ei.description,
  ei.pillar::pillar_type,
  COALESCE(cat.name, 'Enterprise'),
  'HIGH_IS_BETTER'::indicator_direction,
  'MIN_MAX'::normalization_type,
  ei.weight,
  ei.minimum_tier::diagnosis_tier_type,
  'enterprise'::indicator_scope_type,
  ei.category_id,
  ei.benchmark_min,
  ei.benchmark_max,
  ei.benchmark_target,
  ei.collection_frequency,
  ei.unit
FROM public.enterprise_indicators ei
LEFT JOIN public.enterprise_indicator_categories cat ON ei.category_id = cat.id
WHERE ei.is_active = true
ON CONFLICT (code) DO UPDATE SET
  indicator_scope = 'enterprise'::indicator_scope_type,
  enterprise_category_id = EXCLUDED.enterprise_category_id,
  benchmark_min = EXCLUDED.benchmark_min,
  benchmark_max = EXCLUDED.benchmark_max,
  benchmark_target = EXCLUDED.benchmark_target,
  collection_frequency = EXCLUDED.collection_frequency;

-- =============================================================
-- 3. Criar índice para performance em filtros de escopo
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_indicators_scope ON public.indicators(indicator_scope);
CREATE INDEX IF NOT EXISTS idx_indicators_enterprise_category ON public.indicators(enterprise_category_id);

-- =============================================================
-- 4. Atualizar indicadores territoriais existentes com scope correto
-- =============================================================

UPDATE public.indicators
SET indicator_scope = 'territorial'::indicator_scope_type
WHERE indicator_scope IS NULL 
   OR code NOT LIKE 'ENT_%';