-- 1. Novos campos no schema de indicadores
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS formula TEXT,
  ADD COLUMN IF NOT EXISTS evidence_url TEXT;

COMMENT ON COLUMN public.indicators.formula IS 'Fórmula de cálculo em linguagem natural (ex: "leitos / população * 1000")';
COMMENT ON COLUMN public.indicators.evidence_url IS 'URL da fonte oficial / metodologia de referência';
COMMENT ON COLUMN public.indicators.direction IS 'Polaridade: HIGH_IS_BETTER ou LOW_IS_BETTER';
COMMENT ON COLUMN public.indicators.data_source IS 'Origem do dado: API_OFICIAL, MANUAL, CALCULADO, ESTIMADO';
COMMENT ON COLUMN public.indicators.collection_type IS 'Método de coleta: AUTOMATICA, MANUAL, ESTIMADA';
COMMENT ON COLUMN public.indicators.notes IS 'Observações metodológicas';
COMMENT ON COLUMN public.indicators.reliability_score IS 'Score de confiabilidade derivado de collection_type (1.0/0.7/0.4)';

-- 2. Renomeia o indicador CADASTUR de leitos para evitar colisão semântica com leitos hospitalares
UPDATE public.external_indicator_values
SET indicator_code = 'igma_leitos_hospedagem_por_habitante'
WHERE indicator_code = 'igma_leitos_por_habitante';

UPDATE public.assessment_indicator_audit
SET indicator_code = 'igma_leitos_hospedagem_por_habitante'
WHERE indicator_code = 'igma_leitos_por_habitante';

UPDATE public.indicators
SET code = 'igma_leitos_hospedagem_por_habitante',
    name = 'Leitos de Hospedagem por Habitante',
    description = COALESCE(description, '') ||
      CASE WHEN COALESCE(description,'') = '' THEN '' ELSE E'\n\n' END ||
      'Leitos de meios de hospedagem cadastrados no CADASTUR por habitante. NÃO confundir com leitos hospitalares SUS (indicador igma_leitos_hospitalares_sus_por_mil_habitantes, fonte DATASUS).',
    notes = 'Renomeado em v1.38.0 (antigo: igma_leitos_por_habitante) para evitar ambiguidade com leitos hospitalares.'
WHERE code = 'igma_leitos_por_habitante';