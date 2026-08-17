DROP INDEX IF EXISTS public.uniq_indicator_values_assessment_indicator_unit;
DROP INDEX IF EXISTS public.uniq_indicator_values_assessment_indicator_null_unit;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_indicator_values_assessment_indicator_unit
  ON public.indicator_values (assessment_id, indicator_id, unit_id) NULLS NOT DISTINCT;

DROP INDEX IF EXISTS public.uniq_enterprise_indicator_values_assessment_indicator_unit;
DROP INDEX IF EXISTS public.uniq_enterprise_indicator_values_assessment_indicator_null_unit;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_enterprise_indicator_values_assessment_indicator_unit
  ON public.enterprise_indicator_values (assessment_id, indicator_id, unit_id) NULLS NOT DISTINCT;