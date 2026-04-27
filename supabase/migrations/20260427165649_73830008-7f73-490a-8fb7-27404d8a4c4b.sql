-- Phase 2 — Block A: Reclassify IGMA indicators from MANUAL to official source
-- Maps 76 IGMA indicators to their canonical Brazilian official data source.

-- 1) DATASUS — Health & Well-being indicators
UPDATE public.indicators
SET data_source = 'DATASUS',
    collection_type = 'AUTOMATICA'
WHERE data_source = 'MANUAL'
  AND code LIKE 'igma_%'
  AND (
    igma_dimension = 'Saúde e Bem-Estar'
    OR code IN (
      'igma_aplicacao_saude_minimo_constitucional',
      'igma_cobertura_potencial_da_atencao_primaria',
      'igma_cobertura_vacinal',
      'igma_desnutricao_infantil',
      'igma_expectativa_de_vida_ao_nascer',
      'igma_gasto_por_habitante_em_saude_ajustado_por_expectativa_de_vida',
      'igma_obitos_por_causas_evitaveis'
    )
  );

-- 2) INEP — Education indicators
UPDATE public.indicators
SET data_source = 'INEP',
    collection_type = 'AUTOMATICA'
WHERE data_source = 'MANUAL'
  AND code LIKE 'igma_%'
  AND code IN (
    'igma_taxa_escolarizacao',
    'igma_jovens_que_completaram_o_ensino_medio',
    'igma_pessoas_que_completaram_o_ensino_superior'
  );

-- 3) STN — Public finance indicators
UPDATE public.indicators
SET data_source = 'STN',
    collection_type = 'AUTOMATICA'
WHERE data_source = 'MANUAL'
  AND code LIKE 'igma_%'
  AND code IN (
    'igma_indice_firjan_de_gestao_fiscal',
    'igma_carga_tributaria_municipal',
    'igma_arrecadacao_propria',
    'igma_dependencia_de_transferencias'
  );

-- 4) IBGE — catch-all for remaining IGMA indicators
UPDATE public.indicators
SET data_source = 'IBGE',
    collection_type = 'AUTOMATICA'
WHERE data_source = 'MANUAL'
  AND code LIKE 'igma_%'
  AND code NOT IN ('igma_iptl', 'igma_iiet');

-- 5) Mark SISTUR proprietary IGMA indices as derived/estimated
UPDATE public.indicators
SET data_source = 'OUTRO',
    collection_type = 'ESTIMADA',
    notes = COALESCE(notes, '') || E'\n[Indicador SISTUR proprietário — calculado a partir de outros indicadores]'
WHERE data_source = 'MANUAL'
  AND code IN ('igma_iptl', 'igma_iiet');

-- 6) Telemetry
DO $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.indicators
  WHERE code LIKE 'igma_%' AND data_source != 'MANUAL';
  RAISE NOTICE 'Phase 2 Block A complete: % IGMA indicators reclassified', v_total;
END $$;