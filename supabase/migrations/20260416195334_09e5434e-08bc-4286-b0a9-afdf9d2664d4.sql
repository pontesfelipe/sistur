-- 1. Cadastrar 'ana_iqa' como indicador canônico do Índice de Qualidade da Água
INSERT INTO public.indicators (
  code,
  name,
  pillar,
  theme,
  description,
  unit,
  direction,
  normalization,
  min_ref,
  max_ref,
  weight,
  indicator_scope,
  minimum_tier
) VALUES (
  'ana_iqa',
  'Índice de Qualidade da Água (IQA)',
  'RA',
  'Ecológico',
  'IQA médio das estações de monitoramento da ANA (Agência Nacional de Águas) em raio de 50 km do município. Pré-preenchido automaticamente via integração Hidroweb/Qualiágua.',
  'IQA (0-100)',
  'HIGH_IS_BETTER',
  'MIN_MAX',
  0,
  100,
  1.0,
  'territorial',
  'SMALL'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  pillar = EXCLUDED.pillar,
  theme = EXCLUDED.theme,
  direction = EXCLUDED.direction,
  normalization = EXCLUDED.normalization,
  min_ref = EXCLUDED.min_ref,
  max_ref = EXCLUDED.max_ref,
  indicator_scope = EXCLUDED.indicator_scope,
  minimum_tier = EXCLUDED.minimum_tier;

-- 2. Migrar quaisquer valores manuais do RA002 para o ana_iqa (preservando dados históricos)
DO $$
DECLARE
  v_ra002_id uuid;
  v_ana_iqa_id uuid;
BEGIN
  SELECT id INTO v_ra002_id FROM public.indicators WHERE code = 'RA002';
  SELECT id INTO v_ana_iqa_id FROM public.indicators WHERE code = 'ana_iqa';

  IF v_ra002_id IS NOT NULL AND v_ana_iqa_id IS NOT NULL THEN
    -- Migrar valores onde não exista já um ana_iqa para o mesmo assessment
    UPDATE public.indicator_values iv
    SET indicator_id = v_ana_iqa_id
    WHERE iv.indicator_id = v_ra002_id
      AND NOT EXISTS (
        SELECT 1 FROM public.indicator_values iv2
        WHERE iv2.assessment_id = iv.assessment_id
          AND iv2.indicator_id = v_ana_iqa_id
      );

    -- Migrar scores também
    UPDATE public.indicator_scores isc
    SET indicator_id = v_ana_iqa_id
    WHERE isc.indicator_id = v_ra002_id
      AND NOT EXISTS (
        SELECT 1 FROM public.indicator_scores isc2
        WHERE isc2.assessment_id = isc.assessment_id
          AND isc2.indicator_id = v_ana_iqa_id
      );

    -- 3. Arquivar o RA002 renomeando código (impede uso futuro mas preserva histórico)
    UPDATE public.indicators
    SET code = 'RA002_ARCHIVED',
        name = '[ARQUIVADO] ' || name,
        indicator_scope = 'territorial',
        minimum_tier = 'COMPLETE'
    WHERE id = v_ra002_id;
  END IF;
END $$;