-- Recriar a view sem SECURITY DEFINER (usar security_invoker para respeitar RLS do chamador)
DROP VIEW IF EXISTS public.indicator_scores_enriched;

CREATE VIEW public.indicator_scores_enriched
WITH (security_invoker = true)
AS
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
  s.value_raw,
  s.value_normalized,
  s.score_pct,
  s.score AS score_legacy_0_1,
  COALESCE(s.polarity, i.direction::text) AS polarity,
  COALESCE(s.normalization_method, i.normalization::text) AS normalization_method,
  s.min_ref_used,
  s.max_ref_used,
  s.weight_used,
  i.data_source,
  i.collection_type,
  i.source,
  s.confidence_level,
  CASE
    WHEN s.confidence_level >= 0.95 THEN 'verificado'
    WHEN s.confidence_level >= 0.65 THEN 'auditoria_pendente'
    ELSE 'baixa_confianca'
  END AS audit_badge,
  s.computed_at
FROM public.indicator_scores s
JOIN public.indicators i ON i.id = s.indicator_id;

COMMENT ON VIEW public.indicator_scores_enriched IS 'Visão consolidada com pipeline raw→normalized→score, polaridade aplicada, fonte e selo de auditoria. Respeita RLS do usuário (security_invoker).';