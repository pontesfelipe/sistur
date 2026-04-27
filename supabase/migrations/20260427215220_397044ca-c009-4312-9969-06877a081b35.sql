CREATE OR REPLACE FUNCTION public.get_severity_5_levels(p_score numeric)
RETURNS public.severity_type
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_score >= 0.90 THEN 'EXCELENTE'::public.severity_type
    WHEN p_score >= 0.80 THEN 'FORTE'::public.severity_type
    WHEN p_score >= 0.67 THEN 'BOM'::public.severity_type
    WHEN p_score >= 0.34 THEN 'MODERADO'::public.severity_type
    ELSE 'CRITICO'::public.severity_type
  END;
$$;

COMMENT ON FUNCTION public.get_severity_5_levels(numeric) IS
'SISTUR Fase 5 — Régua canônica de 5 níveis. Use no engine, queries SQL e relatórios.';