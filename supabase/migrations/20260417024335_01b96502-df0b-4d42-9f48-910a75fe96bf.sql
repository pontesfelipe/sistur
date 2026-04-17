-- Etapa A: Score Final SISTUR + Classificação 5 faixas
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS final_score numeric,
  ADD COLUMN IF NOT EXISTS final_classification text;

COMMENT ON COLUMN public.assessments.final_score IS
  'Score Final SISTUR: (RA*0.35) + (OE*0.30) + (AO*0.35). Valor 0–1. Uso interno apenas.';
COMMENT ON COLUMN public.assessments.final_classification IS
  '5 faixas: CRITICO (0-0.39), INSUFICIENTE (0.40-0.54), EM_DESENVOLVIMENTO (0.55-0.69), BOM (0.70-0.84), EXCELENTE (0.85-1.00).';

CREATE INDEX IF NOT EXISTS idx_assessments_final_score
  ON public.assessments(final_score) WHERE final_score IS NOT NULL;