-- Phase 15.4 Fase 3 — permitir múltiplas linhas (uma por unidade) na mesma assessment
-- O índice único legado (assessment_id, indicator_id) não é parcial e bloqueia
-- inserções por unit_id. Substituímos por um índice parcial WHERE unit_id IS NULL,
-- mantendo a unicidade legada para valores globais (single-unit / territorial)
-- e deixando o índice parcial WHERE unit_id IS NOT NULL (já existente) cuidar
-- da unicidade multi-unidade.

ALTER TABLE public.indicator_values
  DROP CONSTRAINT IF EXISTS indicator_values_assessment_id_indicator_id_key;

DROP INDEX IF EXISTS public.indicator_values_assessment_id_indicator_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_indicator_values_assessment_indicator_null_unit
  ON public.indicator_values(assessment_id, indicator_id)
  WHERE unit_id IS NULL;

ALTER TABLE public.enterprise_indicator_values
  DROP CONSTRAINT IF EXISTS enterprise_indicator_values_indicator_id_assessment_id_key;

DROP INDEX IF EXISTS public.enterprise_indicator_values_indicator_id_assessment_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_enterprise_indicator_values_assessment_indicator_null_unit
  ON public.enterprise_indicator_values(assessment_id, indicator_id)
  WHERE unit_id IS NULL;
