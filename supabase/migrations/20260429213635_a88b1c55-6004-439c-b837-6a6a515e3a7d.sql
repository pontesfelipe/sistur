-- Estender a limpeza: zerar score de TODOS os contextuais (peso=0),
-- não só os que estavam em 0. Isso pega Área Territorial e População
-- que ficaram com score=1 da normalização antiga.
UPDATE public.indicator_scores AS isc
SET score = NULL,
    value_normalized = NULL,
    score_pct = NULL,
    normalization_method = 'contextual'
FROM public.indicators AS i
WHERE isc.indicator_id = i.id
  AND (i.weight IS NULL OR i.weight = 0)
  AND (isc.score IS NOT NULL OR isc.normalization_method <> 'contextual');