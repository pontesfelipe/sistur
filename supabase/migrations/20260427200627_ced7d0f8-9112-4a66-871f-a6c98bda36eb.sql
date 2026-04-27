-- 1. Audit table for indicator provenance per assessment
CREATE TABLE IF NOT EXISTS public.assessment_indicator_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_code TEXT NOT NULL,
  pillar TEXT,
  value NUMERIC,
  normalized_score NUMERIC,
  source_type TEXT NOT NULL, -- 'MANUAL' | 'DERIVED' | 'AUTOMATICA' | 'ESTIMADA' | 'OFFICIAL_API'
  source_detail TEXT,        -- e.g. 'IBGE 2022', 'CADASTUR 2025-Q1', 'formula:igma_guias_por_10k'
  weight NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_assessment ON public.assessment_indicator_audit(assessment_id);
CREATE INDEX IF NOT EXISTS idx_audit_source_type ON public.assessment_indicator_audit(source_type);

ALTER TABLE public.assessment_indicator_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and org admins can view audit"
ON public.assessment_indicator_audit
FOR SELECT
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_indicator_audit.assessment_id
      AND public.has_role_in_org(auth.uid(), a.org_id, 'ORG_ADMIN'::app_role)
  )
);

CREATE POLICY "Service role can insert audit"
ON public.assessment_indicator_audit
FOR INSERT
WITH CHECK (true);

-- 2. RPC: External data quality dashboard
CREATE OR REPLACE FUNCTION public.get_external_data_quality()
RETURNS TABLE(
  source TEXT,
  total_records BIGINT,
  distinct_municipalities BIGINT,
  last_collected_at TIMESTAMP WITH TIME ZONE,
  age_days NUMERIC,
  coverage_pct NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_municipalities BIGINT;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_org_admin_role(auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT COUNT(DISTINCT ibge_code) INTO v_total_municipalities
  FROM public.destinations
  WHERE ibge_code IS NOT NULL;

  IF v_total_municipalities = 0 THEN
    v_total_municipalities := 1;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(eiv.source, 'unknown')::TEXT AS source,
    COUNT(*)::BIGINT AS total_records,
    COUNT(DISTINCT eiv.municipality_ibge_code)::BIGINT AS distinct_municipalities,
    MAX(eiv.collected_at) AS last_collected_at,
    ROUND(EXTRACT(EPOCH FROM (now() - MAX(eiv.collected_at))) / 86400.0, 1) AS age_days,
    ROUND(
      (COUNT(DISTINCT eiv.municipality_ibge_code)::NUMERIC / v_total_municipalities) * 100,
      1
    ) AS coverage_pct
  FROM public.external_indicator_values eiv
  WHERE eiv.municipality_ibge_code IS NOT NULL
  GROUP BY eiv.source
  ORDER BY MAX(eiv.collected_at) DESC NULLS LAST;
END;
$$;

-- 3. RPC: Get audit trail for a specific assessment
CREATE OR REPLACE FUNCTION public.get_assessment_audit(p_assessment_id UUID)
RETURNS TABLE(
  indicator_code TEXT,
  pillar TEXT,
  value NUMERIC,
  normalized_score NUMERIC,
  source_type TEXT,
  source_detail TEXT,
  weight NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT a.org_id INTO v_org_id FROM public.assessments a WHERE a.id = p_assessment_id;

  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role_in_org(auth.uid(), v_org_id, 'ORG_ADMIN'::app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    a.indicator_code,
    a.pillar,
    a.value,
    a.normalized_score,
    a.source_type,
    a.source_detail,
    a.weight
  FROM public.assessment_indicator_audit a
  WHERE a.assessment_id = p_assessment_id
  ORDER BY a.pillar, a.indicator_code;
END;
$$;