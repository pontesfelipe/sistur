CREATE OR REPLACE FUNCTION public.compute_derived_indicators(p_ibge_code text, p_org_id uuid)
 RETURNS TABLE(indicator_code text, raw_value numeric, source_code text, reference_year integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pop NUMERIC; v_pop_year INT;
  v_guias NUMERIC; v_hosp NUMERIC; v_ag NUMERIC; v_cad_year INT;
  v_emp NUMERIC; v_emp_year INT;
  v_desp NUMERIC; v_desp_year INT;
  v_arr NUMERIC; v_arr_year INT;
  v_vn NUMERIC; v_vi NUMERIC; v_v_year INT;
  v_revenue_pc NUMERIC;
  v_pib_mun NUMERIC; v_pib_mun_year INT;
  v_pib_br NUMERIC; v_pib_br_year INT;
  v_ipcr NUMERIC;
BEGIN
  SELECT e.raw_value, e.reference_year INTO v_pop, v_pop_year
  FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_populacao' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  IF v_pop IS NULL OR v_pop <= 0 THEN RETURN; END IF;

  SELECT e.raw_value, e.reference_year INTO v_guias, v_cad_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_guias_turismo' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value INTO v_hosp FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_meios_hospedagem' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value INTO v_ag FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_agencias_turismo' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value, e.reference_year INTO v_emp, v_emp_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_empregos_turismo' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value, e.reference_year INTO v_desp, v_desp_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_despesa_turismo' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value, e.reference_year INTO v_arr, v_arr_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_arrecadacao_turismo' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value, e.reference_year INTO v_vn, v_v_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_visitantes_nacionais' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value INTO v_vi FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_visitantes_internacionais' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;

  SELECT e.raw_value, e.reference_year INTO v_pib_mun, v_pib_mun_year
  FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_pib_per_capita' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;

  IF v_pib_mun IS NOT NULL AND v_pib_mun > 0 THEN
    SELECT n.value, n.reference_year INTO v_pib_br, v_pib_br_year
    FROM public.national_reference_values n
    WHERE n.indicator_code = 'igma_pib_per_capita'
      AND n.reference_year <= COALESCE(v_pib_mun_year, 9999)
    ORDER BY n.reference_year DESC LIMIT 1;

    IF v_pib_br IS NULL THEN
      SELECT n.value, n.reference_year INTO v_pib_br, v_pib_br_year
      FROM public.national_reference_values n
      WHERE n.indicator_code = 'igma_pib_per_capita'
      ORDER BY n.reference_year DESC LIMIT 1;
    END IF;

    IF v_pib_br IS NOT NULL AND v_pib_br > 0 THEN
      v_ipcr := ROUND((v_pib_mun / v_pib_br) * 100, 2);
      RETURN QUERY SELECT 'igma_ipcr'::TEXT, v_ipcr, 'IBGE_PIB_PER_CAPITA+REF_NACIONAL'::TEXT, COALESCE(v_pib_mun_year, v_pib_br_year);
    END IF;
  END IF;

  IF v_guias IS NOT NULL THEN RETURN QUERY SELECT 'igma_guias_por_10k'::TEXT, ROUND((v_guias / v_pop) * 10000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_cad_year, v_pop_year); END IF;
  IF v_hosp IS NOT NULL THEN RETURN QUERY SELECT 'igma_hospedagem_por_10k'::TEXT, ROUND((v_hosp / v_pop) * 10000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_cad_year, v_pop_year); END IF;
  IF v_ag IS NOT NULL THEN RETURN QUERY SELECT 'igma_agencias_por_10k'::TEXT, ROUND((v_ag / v_pop) * 10000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_cad_year, v_pop_year); END IF;
  IF v_emp IS NOT NULL THEN RETURN QUERY SELECT 'igma_empregos_turismo_por_1k'::TEXT, ROUND((v_emp / v_pop) * 1000, 2), 'MAPA_TURISMO+IBGE'::TEXT, COALESCE(v_emp_year, v_pop_year); END IF;
  IF v_desp IS NOT NULL THEN RETURN QUERY SELECT 'igma_despesa_turismo_per_capita'::TEXT, ROUND(v_desp / v_pop, 2), 'STN+IBGE'::TEXT, COALESCE(v_desp_year, v_pop_year); END IF;
  IF v_arr IS NOT NULL THEN RETURN QUERY SELECT 'igma_arrecadacao_turismo_per_capita'::TEXT, ROUND(v_arr / v_pop, 2), 'STN+IBGE'::TEXT, COALESCE(v_arr_year, v_pop_year); END IF;

  IF (COALESCE(v_vn,0) + COALESCE(v_vi,0)) > 0 THEN
    v_revenue_pc := public.compute_tourism_revenue_per_capita(p_ibge_code);
    IF v_revenue_pc IS NOT NULL THEN
      RETURN QUERY SELECT 'igma_receita_turismo_per_capita'::TEXT, v_revenue_pc, 'CALC_RECEITA_TURISMO'::TEXT, COALESCE(v_v_year, v_pop_year);
    END IF;
  END IF;

  RETURN;
END;
$function$;