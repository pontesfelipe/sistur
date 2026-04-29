-- Permitir NULL em score (indicadores contextuais não pontuam)
ALTER TABLE public.indicator_scores
  ALTER COLUMN score DROP NOT NULL;

ALTER TABLE public.indicator_scores
  DROP CONSTRAINT IF EXISTS indicator_scores_score_check;

ALTER TABLE public.indicator_scores
  ADD CONSTRAINT indicator_scores_score_check
  CHECK (score IS NULL OR (score >= 0::double precision AND score <= 1::double precision));

-- Limpar registros legados: contextuais (peso=0) que ficaram com score=0 falso
UPDATE public.indicator_scores AS isc
SET score = NULL,
    value_normalized = NULL,
    score_pct = NULL,
    normalization_method = 'contextual'
FROM public.indicators AS i
WHERE isc.indicator_id = i.id
  AND (i.weight IS NULL OR i.weight = 0)
  AND isc.score = 0;

COMMENT ON COLUMN public.indicator_scores.score IS
  'Score normalizado 0-1. NULL para indicadores contextuais (peso=0) que apenas caracterizam o destino e não pontuam.';