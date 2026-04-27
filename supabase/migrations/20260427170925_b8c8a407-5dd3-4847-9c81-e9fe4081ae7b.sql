INSERT INTO public.indicators (
  code, name, pillar, theme, description, unit,
  direction, normalization, min_ref, max_ref, weight,
  data_source, collection_type,
  igma_dimension, default_interpretation, minimum_tier,
  benchmark_min, benchmark_max, benchmark_target,
  collection_frequency, indicator_scope, value_format,
  source, notes
) VALUES
('igma_guias_por_10k', 'Guias de Turismo por 10 mil habitantes', 'OE', 'Superestrutura',
  'Número de guias de turismo cadastrados no CADASTUR por 10.000 habitantes.', 'guias/10k hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 50, 0.025,
  'CADASTUR', 'ESTIMADA', 'Superestrutura', 'Estrutural', 'COMPLETE',
  0, 50, 15, 'Trimestral', 'territorial', 'RATE_PER_CAPITA',
  'CADASTUR + IBGE', 'Calculado: (igma_guias_turismo / igma_populacao) * 10000'),
('igma_hospedagem_por_10k', 'Meios de Hospedagem por 10 mil habitantes', 'OE', 'Superestrutura',
  'Meios de hospedagem do CADASTUR por 10.000 habitantes.', 'unidades/10k hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 30, 0.025,
  'CADASTUR', 'ESTIMADA', 'Superestrutura', 'Estrutural', 'COMPLETE',
  0, 30, 8, 'Trimestral', 'territorial', 'RATE_PER_CAPITA',
  'CADASTUR + IBGE', 'Calculado: (igma_meios_hospedagem / igma_populacao) * 10000'),
('igma_agencias_por_10k', 'Agências de Turismo por 10 mil habitantes', 'OE', 'Superestrutura',
  'Agências de turismo do CADASTUR por 10.000 habitantes.', 'agências/10k hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 20, 0.025,
  'CADASTUR', 'ESTIMADA', 'Superestrutura', 'Estrutural', 'COMPLETE',
  0, 20, 5, 'Trimestral', 'territorial', 'RATE_PER_CAPITA',
  'CADASTUR + IBGE', 'Calculado: (igma_agencias_turismo / igma_populacao) * 10000'),
('igma_empregos_turismo_por_1k', 'Empregos em Turismo por 1 mil habitantes', 'OE', 'Mercado de Trabalho',
  'Empregos formais em atividades turísticas por 1.000 habitantes.', 'empregos/1k hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 100, 0.025,
  'MAPA_TURISMO', 'ESTIMADA', 'Mercado de Trabalho', 'Entrega', 'COMPLETE',
  0, 100, 30, 'Anual', 'territorial', 'RATE_PER_CAPITA',
  'Mapa do Turismo + IBGE', 'Calculado: (igma_empregos_turismo / igma_populacao) * 1000'),
('igma_despesa_turismo_per_capita', 'Despesa Pública em Turismo per capita', 'AO', 'Governança, Eficiência Fiscal e Transparência',
  'Despesa pública municipal com turismo por habitante.', 'R$/hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 200, 0.020,
  'STN', 'ESTIMADA', 'Governança, Eficiência Fiscal e Transparência', 'Gestão', 'COMPLETE',
  0, 200, 50, 'Anual', 'territorial', 'CURRENCY',
  'STN + IBGE', 'Calculado: (igma_despesa_turismo * 1000) / igma_populacao'),
('igma_arrecadacao_turismo_per_capita', 'Arrecadação Turística per capita', 'AO', 'Governança, Eficiência Fiscal e Transparência',
  'Arrecadação tributária associada ao turismo por habitante.', 'R$/hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 500, 0.020,
  'MAPA_TURISMO', 'ESTIMADA', 'Governança, Eficiência Fiscal e Transparência', 'Entrega', 'COMPLETE',
  0, 500, 100, 'Anual', 'territorial', 'CURRENCY',
  'Mapa do Turismo + IBGE', 'Calculado: igma_arrecadacao_turismo / igma_populacao'),
('igma_visitantes_por_habitante', 'Taxa de Turistificação (visitantes por habitante)', 'RA', 'Pressão Turística',
  'Razão entre visitantes (nacionais + internacionais) e população residente.', 'visitantes/hab.',
  'HIGH_IS_BETTER', 'MIN_MAX', 0, 20, 0.025,
  'MAPA_TURISMO', 'ESTIMADA', 'Pressão Turística', 'Entrega', 'COMPLETE',
  0, 20, 5, 'Anual', 'territorial', 'RATIO',
  'Mapa do Turismo + IBGE', 'Calculado: (igma_visitantes_nacionais + igma_visitantes_internacionais) / igma_populacao')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, unit = EXCLUDED.unit,
  direction = EXCLUDED.direction, normalization = EXCLUDED.normalization,
  min_ref = EXCLUDED.min_ref, max_ref = EXCLUDED.max_ref,
  data_source = EXCLUDED.data_source, collection_type = EXCLUDED.collection_type,
  benchmark_min = EXCLUDED.benchmark_min, benchmark_max = EXCLUDED.benchmark_max,
  benchmark_target = EXCLUDED.benchmark_target, notes = EXCLUDED.notes;

CREATE OR REPLACE FUNCTION public.compute_derived_indicators(p_ibge_code TEXT, p_org_id UUID)
RETURNS TABLE(indicator_code TEXT, raw_value NUMERIC, source_code TEXT, reference_year INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pop NUMERIC; v_pop_year INT;
  v_guias NUMERIC; v_hosp NUMERIC; v_ag NUMERIC; v_cad_year INT;
  v_emp NUMERIC; v_emp_year INT;
  v_desp NUMERIC; v_desp_year INT;
  v_arr NUMERIC; v_arr_year INT;
  v_vn NUMERIC; v_vi NUMERIC; v_v_year INT;
BEGIN
  SELECT raw_value, reference_year INTO v_pop, v_pop_year
  FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_populacao' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  IF v_pop IS NULL OR v_pop <= 0 THEN RETURN; END IF;

  SELECT raw_value, reference_year INTO v_guias, v_cad_year FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_guias_turismo' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value INTO v_hosp FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_meios_hospedagem' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value INTO v_ag FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_agencias_turismo' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value, reference_year INTO v_emp, v_emp_year FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_empregos_turismo' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value, reference_year INTO v_desp, v_desp_year FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_despesa_turismo' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value, reference_year INTO v_arr, v_arr_year FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_arrecadacao_turismo' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value, reference_year INTO v_vn, v_v_year FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_visitantes_nacionais' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;
  SELECT raw_value INTO v_vi FROM public.external_indicator_values
  WHERE municipality_ibge_code = p_ibge_code AND indicator_code = 'igma_visitantes_internacionais' AND validated = true
  ORDER BY reference_year DESC NULLS LAST LIMIT 1;

  IF v_guias IS NOT NULL THEN RETURN QUERY SELECT 'igma_guias_por_10k'::TEXT, ROUND((v_guias / v_pop) * 10000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_cad_year, v_pop_year); END IF;
  IF v_hosp IS NOT NULL THEN RETURN QUERY SELECT 'igma_hospedagem_por_10k'::TEXT, ROUND((v_hosp / v_pop) * 10000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_cad_year, v_pop_year); END IF;
  IF v_ag IS NOT NULL THEN RETURN QUERY SELECT 'igma_agencias_por_10k'::TEXT, ROUND((v_ag / v_pop) * 10000, 2), 'CADASTUR+IBGE'::TEXT, COALESCE(v_cad_year, v_pop_year); END IF;
  IF v_emp IS NOT NULL THEN RETURN QUERY SELECT 'igma_empregos_turismo_por_1k'::TEXT, ROUND((v_emp / v_pop) * 1000, 2), 'MAPA_TURISMO+IBGE'::TEXT, COALESCE(v_emp_year, v_pop_year); END IF;
  IF v_desp IS NOT NULL THEN RETURN QUERY SELECT 'igma_despesa_turismo_per_capita'::TEXT, ROUND((v_desp * 1000) / v_pop, 2), 'STN+IBGE'::TEXT, COALESCE(v_desp_year, v_pop_year); END IF;
  IF v_arr IS NOT NULL THEN RETURN QUERY SELECT 'igma_arrecadacao_turismo_per_capita'::TEXT, ROUND(v_arr / v_pop, 2), 'MAPA_TURISMO+IBGE'::TEXT, COALESCE(v_arr_year, v_pop_year); END IF;
  IF v_vn IS NOT NULL OR v_vi IS NOT NULL THEN
    RETURN QUERY SELECT 'igma_visitantes_por_habitante'::TEXT,
      ROUND((COALESCE(v_vn,0) + COALESCE(v_vi,0)) / v_pop, 4),
      'MAPA_TURISMO+IBGE'::TEXT, COALESCE(v_v_year, v_pop_year);
  END IF;
  RETURN;
END; $$;

GRANT EXECUTE ON FUNCTION public.compute_derived_indicators(TEXT, UUID) TO authenticated, service_role;