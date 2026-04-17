-- ============================================================================
-- ETAPA 1+2: Separação valor/índice/score + Memória de cálculo auditável
-- ============================================================================

-- Etapa 1: Separar campos em indicator_scores
ALTER TABLE public.indicator_scores
  ADD COLUMN IF NOT EXISTS value_raw NUMERIC,
  ADD COLUMN IF NOT EXISTS value_normalized NUMERIC,
  ADD COLUMN IF NOT EXISTS score_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS polarity TEXT,
  ADD COLUMN IF NOT EXISTS normalization_method TEXT,
  ADD COLUMN IF NOT EXISTS confidence_level NUMERIC DEFAULT 0.7;

COMMENT ON COLUMN public.indicator_scores.value_raw IS 'Valor bruto original do indicador (ex: densidade=42, IDH=0.751, leitos=1200)';
COMMENT ON COLUMN public.indicator_scores.value_normalized IS 'Valor normalizado em escala 0-1 após aplicar polaridade e método de normalização';
COMMENT ON COLUMN public.indicator_scores.score_pct IS 'Score percentual final exibido em relatórios (0-100)';
COMMENT ON COLUMN public.indicator_scores.polarity IS 'Polaridade aplicada: HIGH_IS_BETTER, LOW_IS_BETTER, NEUTRAL';
COMMENT ON COLUMN public.indicator_scores.normalization_method IS 'Método aplicado: MIN_MAX, BANDS, BINARY, LINEAR, INVERSE, BENCHMARK';
COMMENT ON COLUMN public.indicator_scores.confidence_level IS 'Confiança no cálculo (0-1). Manual=0.7, Automática=1.0, Estimada=0.4';

-- Backfill: copiar score atual (já em 0-1) para value_normalized e score_pct
UPDATE public.indicator_scores
SET value_normalized = score,
    score_pct = ROUND((score * 100)::numeric, 2)
WHERE value_normalized IS NULL;

-- ============================================================================
-- Etapa 2: Tabela de memória de cálculo (trilha auditável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.indicator_calculation_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  indicator_score_id UUID REFERENCES public.indicator_scores(id) ON DELETE CASCADE,
  
  -- Trilha matemática
  formula_text TEXT NOT NULL, -- Ex: "score = (valor - min) / (max - min)"
  formula_variables JSONB NOT NULL DEFAULT '{}'::jsonb, -- Ex: {"valor": 42, "min": 0, "max": 100}
  
  -- Procedência
  data_sources JSONB NOT NULL DEFAULT '[]'::jsonb, -- Ex: [{"name":"IBGE","url":"...","accessed_at":"..."}]
  reference_year INTEGER,
  reference_date DATE,
  
  -- Etapas do pipeline
  step_raw JSONB, -- {"value": 42, "unit": "%"}
  step_normalized JSONB, -- {"value": 0.42, "polarity_applied": "HIGH_IS_BETTER"}
  step_score JSONB, -- {"value": 42, "weight_applied": 0.5, "weighted_score": 21}
  
  -- Auditoria
  computed_by TEXT, -- 'system' | 'manual' | 'edge_function:calculate-assessment'
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT calc_trail_unique_per_score UNIQUE (assessment_id, indicator_id)
);

CREATE INDEX IF NOT EXISTS idx_calc_trail_assessment ON public.indicator_calculation_trail(assessment_id);
CREATE INDEX IF NOT EXISTS idx_calc_trail_indicator ON public.indicator_calculation_trail(indicator_id);
CREATE INDEX IF NOT EXISTS idx_calc_trail_org ON public.indicator_calculation_trail(org_id);

ALTER TABLE public.indicator_calculation_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calculation trails in their org"
  ON public.indicator_calculation_trail FOR SELECT
  TO authenticated
  USING (org_id = get_effective_org_id() OR user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Analysts and admins can manage calculation trails"
  ON public.indicator_calculation_trail FOR ALL
  TO authenticated
  USING (
    user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
  )
  WITH CHECK (
    user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
  );

COMMENT ON TABLE public.indicator_calculation_trail IS 'Memória de cálculo auditável (padrão acadêmico): fórmula, variáveis, fontes e etapas do pipeline para cada score gerado';