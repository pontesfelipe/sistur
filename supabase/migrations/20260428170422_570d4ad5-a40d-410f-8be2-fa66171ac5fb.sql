
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_by_code TEXT;

COMMENT ON COLUMN public.indicators.deprecated_at IS 'Data de depreciação. Indicadores depreciados são ocultados de novos diagnósticos mas preservam histórico.';
COMMENT ON COLUMN public.indicators.replaced_by_code IS 'Código do indicador derivado/calculado que substitui este indicador.';

UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_agencias_por_10k' WHERE code = 'igma_agencias_turismo';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_guias_por_10k' WHERE code = 'igma_guias_turismo';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_hospedagem_por_10k' WHERE code = 'igma_meios_hospedagem';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_leitos_hospedagem_por_habitante' WHERE code = 'OE001';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_despesa_turismo_per_capita' WHERE code = 'igma_despesa_turismo';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_empregos_turismo_por_1k' WHERE code = 'RA006';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'igma_iptl' WHERE code = 'igma_visitantes_por_habitante';
UPDATE public.indicators SET deprecated_at = now(), replaced_by_code = 'ana_iqa' WHERE code = 'RA002_ARCHIVED';

UPDATE public.indicators
  SET data_source = 'CALCULATED'::data_source,
      formula = 'Média entre IDEB anos iniciais e anos finais (INEP)'
  WHERE code = 'igma_ideb';

UPDATE public.indicators
  SET data_source = 'CALCULATED'::data_source,
      formula = 'IPTL = (visitantes nacionais + visitantes internacionais) ÷ população residente'
  WHERE code = 'igma_iptl';

UPDATE public.indicators
  SET data_source = 'CALCULATED'::data_source,
      formula = 'Leitos de hospedagem CADASTUR ÷ população × 1000'
  WHERE code = 'igma_leitos_hospedagem_por_habitante';

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
  v_ideb_ini NUMERIC; v_ideb_fim NUMERIC; v_ideb_year INT;
  v_leitos NUMERIC; v_leitos_year INT;
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

  SELECT e.raw_value, e.reference_year INTO v_leitos, v_leitos_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_leitos_hospedagem' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;

  SELECT e.raw_value, e.reference_year INTO v_ideb_ini, v_ideb_year FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code
    AND e.indicator_code = 'igma_resultado_ideb_anos_iniciais_do_ensino_fundamental' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;
  SELECT e.raw_value INTO v_ideb_fim FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code
    AND e.indicator_code = 'igma_resultado_ideb_anos_finais_do_ensino_fundamental' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;

  SELECT e.raw_value, e.reference_year INTO v_pib_mun, v_pib_mun_year
  FROM public.external_indicator_values e
  WHERE e.municipality_ibge_code = p_ibge_code AND e.indicator_code = 'igma_pib_per_capita' AND e.validated = true
  ORDER BY e.reference_year DESC NULLS LAST LIMIT 1;

  IF v_pib_mun IS NOT NULL AND v_pib_mun > 0 THEN
    SELECT n.value, n.reference_year INTO v_pib_br, v_pib_br_year
    FROM public.national_reference_values n
    WHERE n.indicator_code = 'igma_pib_per_capita' AND n.reference_year <= COALESCE(v_pib_mun_year, 9999)
    ORDER BY n.reference_year DESC LIMIT 1;
    IF v_pib_br IS NULL THEN
      SELECT n.value, n.reference_year INTO v_pib_br, v_pib_br_year
      FROM public.national_reference_values n WHERE n.indicator_code = 'igma_pib_per_capita'
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

  IF v_leitos IS NOT NULL THEN
    RETURN QUERY SELECT 'igma_leitos_hospedagem_por_habitante'::TEXT, ROUND((v_leitos / v_pop) * 1000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_leitos_year, v_pop_year);
  END IF;

  IF (COALESCE(v_vn,0) + COALESCE(v_vi,0)) > 0 THEN
    RETURN QUERY SELECT 'igma_iptl'::TEXT, ROUND((COALESCE(v_vn,0) + COALESCE(v_vi,0)) / v_pop, 4), 'MAPA_TURISMO+IBGE'::TEXT, COALESCE(v_v_year, v_pop_year);
  END IF;

  IF v_ideb_ini IS NOT NULL AND v_ideb_fim IS NOT NULL THEN
    RETURN QUERY SELECT 'igma_ideb'::TEXT, ROUND((v_ideb_ini + v_ideb_fim) / 2, 2), 'INEP_IDEB_INI+FIM'::TEXT, v_ideb_year;
  ELSIF v_ideb_ini IS NOT NULL THEN
    RETURN QUERY SELECT 'igma_ideb'::TEXT, v_ideb_ini, 'INEP_IDEB_INI'::TEXT, v_ideb_year;
  ELSIF v_ideb_fim IS NOT NULL THEN
    RETURN QUERY SELECT 'igma_ideb'::TEXT, v_ideb_fim, 'INEP_IDEB_FIM'::TEXT, v_ideb_year;
  END IF;

  IF (COALESCE(v_vn,0) + COALESCE(v_vi,0)) > 0 THEN
    v_revenue_pc := public.compute_tourism_revenue_per_capita(p_ibge_code);
    IF v_revenue_pc IS NOT NULL THEN
      RETURN QUERY SELECT 'igma_receita_turismo_per_capita'::TEXT, v_revenue_pc, 'CALC_RECEITA_TURISMO'::TEXT, COALESCE(v_v_year, v_pop_year);
    END IF;
  END IF;

  RETURN;
END;
$function$;

UPDATE public.assessments
SET needs_recalculation = true, data_updated_at = now()
WHERE calculated_at IS NOT NULL AND needs_recalculation = false;
