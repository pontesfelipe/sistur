-- Etapa 4: Backfill de confidence_level baseado na fonte do indicador
UPDATE public.indicator_scores s
SET confidence_level = CASE
  WHEN i.collection_type = 'AUTOMATICA' THEN 1.0
  WHEN i.collection_type = 'ESTIMADA' THEN 0.4
  WHEN i.collection_type = 'MANUAL' THEN 0.7
  ELSE 0.5
END
FROM public.indicators i
WHERE s.indicator_id = i.id
  AND (s.confidence_level IS NULL OR s.confidence_level = 0.7);

-- Marcar polarity e normalization_method automaticamente a partir do indicador
UPDATE public.indicator_scores s
SET polarity = i.direction::text,
    normalization_method = i.normalization::text
FROM public.indicators i
WHERE s.indicator_id = i.id
  AND s.polarity IS NULL;

-- ============================================================================
-- Etapa 5: Adicionar indicador CADUNICO baixa renda (canônico)
-- ============================================================================
INSERT INTO public.indicators (
  code, name, pillar, theme, description, unit,
  direction, normalization, min_ref, max_ref, weight,
  data_source, collection_type, source,
  value_format, indicator_scope, criticality, minimum_tier
)
VALUES (
  'cadunico_baixa_renda_pct',
  'População em situação de baixa renda (CADÚNICO)',
  'RA',
  'Vulnerabilidade Social',
  'Percentual de famílias inscritas no Cadastro Único do Governo Federal em relação à população municipal. Polaridade LOW_IS_BETTER: quanto menor, melhor.',
  '%',
  'LOW_IS_BETTER',
  'MIN_MAX',
  0,
  60,
  1.0,
  'OUTRO',
  'AUTOMATICA',
  'CADUNICO/MDS',
  'PERCENTAGE',
  'territorial',
  'high',
  'MEDIUM'
)
ON CONFLICT (code) DO UPDATE SET
  direction = EXCLUDED.direction,
  normalization = EXCLUDED.normalization,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  data_source = EXCLUDED.data_source,
  collection_type = EXCLUDED.collection_type,
  value_format = EXCLUDED.value_format;

-- ============================================================================
-- View facilitadora: scores enriquecidos com metadata + selo de confiança
-- ============================================================================
CREATE OR REPLACE VIEW public.indicator_scores_enriched AS
SELECT
  s.id,
  s.org_id,
  s.assessment_id,
  s.indicator_id,
  i.code AS indicator_code,
  i.name AS indicator_name,
  i.pillar,
  i.theme,
  i.unit,
  i.value_format,
  -- Pipeline de 3 etapas
  s.value_raw,
  s.value_normalized,
  s.score_pct,
  s.score AS score_legacy_0_1,
  -- Metadata aplicada
  COALESCE(s.polarity, i.direction::text) AS polarity,
  COALESCE(s.normalization_method, i.normalization::text) AS normalization_method,
  s.min_ref_used,
  s.max_ref_used,
  s.weight_used,
  -- Procedência
  i.data_source,
  i.collection_type,
  i.source,
  s.confidence_level,
  -- Selo de auditoria
  CASE
    WHEN s.confidence_level >= 0.95 THEN 'verificado'
    WHEN s.confidence_level >= 0.65 THEN 'auditoria_pendente'
    ELSE 'baixa_confianca'
  END AS audit_badge,
  s.computed_at
FROM public.indicator_scores s
JOIN public.indicators i ON i.id = s.indicator_id;

COMMENT ON VIEW public.indicator_scores_enriched IS 'Visão consolidada de scores com pipeline (raw→normalized→score), polaridade aplicada, fonte e selo de auditoria. Use em relatórios e dashboards para evitar joins repetidos.';