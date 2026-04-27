-- List stale assessments (for admin recalc UI)
CREATE OR REPLACE FUNCTION public.get_stale_assessments()
RETURNS TABLE(
  assessment_id UUID,
  destination_id UUID,
  destination_name TEXT,
  ibge_code TEXT,
  org_id UUID,
  org_name TEXT,
  title TEXT,
  calculated_at TIMESTAMPTZ,
  data_updated_at TIMESTAMPTZ,
  age_hours NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS assessment_id,
    a.destination_id,
    d.name AS destination_name,
    d.ibge_code,
    a.org_id,
    o.name AS org_name,
    a.title,
    a.calculated_at,
    a.data_updated_at,
    ROUND(EXTRACT(EPOCH FROM (now() - a.data_updated_at)) / 3600.0, 1) AS age_hours
  FROM public.assessments a
  JOIN public.destinations d ON d.id = a.destination_id
  LEFT JOIN public.orgs o ON o.id = a.org_id
  WHERE a.needs_recalculation = true
    AND a.calculated_at IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'ADMIN'::app_role)
      OR public.has_role_in_org(auth.uid(), a.org_id, 'ORG_ADMIN'::app_role)
    )
  ORDER BY a.data_updated_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_stale_assessments() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_stale_assessments() TO authenticated;

-- Clear stale flag after successful recalculation
CREATE OR REPLACE FUNCTION public.clear_assessment_stale_flag(p_assessment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assessments
  SET needs_recalculation = false
  WHERE id = p_assessment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_assessment_stale_flag(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.clear_assessment_stale_flag(UUID) TO authenticated;