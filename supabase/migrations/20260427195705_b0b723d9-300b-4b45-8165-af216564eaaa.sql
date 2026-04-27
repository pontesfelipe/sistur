-- Add columns to track stale assessments
ALTER TABLE public.assessments 
  ADD COLUMN IF NOT EXISTS needs_recalculation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_assessments_needs_recalc 
  ON public.assessments(needs_recalculation) 
  WHERE needs_recalculation = true;

-- Trigger function: when external indicator values are inserted/updated for a municipality,
-- mark all assessments of destinations in that municipality as needing recalculation
CREATE OR REPLACE FUNCTION public.mark_assessments_stale_on_external_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ibge TEXT := COALESCE(NEW.municipality_ibge_code, OLD.municipality_ibge_code);
BEGIN
  IF v_ibge IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only mark assessments that already have been calculated (have a result)
  UPDATE public.assessments a
  SET needs_recalculation = true,
      data_updated_at = now()
  FROM public.destinations d
  WHERE a.destination_id = d.id
    AND d.ibge_code = v_ibge
    AND a.calculated_at IS NOT NULL
    AND a.needs_recalculation = false;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_assessments_stale_external_data ON public.external_indicator_values;
CREATE TRIGGER trg_mark_assessments_stale_external_data
AFTER INSERT OR UPDATE OF raw_value, raw_value_text, validated, reference_year
ON public.external_indicator_values
FOR EACH ROW
EXECUTE FUNCTION public.mark_assessments_stale_on_external_data();