-- Calibrar indicadores IGMA estruturais
-- Descritores estruturais (peso 0 — não pontuam, apenas contexto)
UPDATE public.indicators 
SET weight = 0,
    description = COALESCE(description, '') || E'\n\n[Descritor estrutural — característica do território, não pontua no score]'
WHERE code IN ('igma_populacao', 'igma_area_territorial', 'igma_densidade_demografica');

-- Indicadores com benchmarks oficiais brasileiros
UPDATE public.indicators SET min_ref = 0.4, max_ref = 0.9, benchmark_target = 0.8 WHERE code = 'igma_idh';
UPDATE public.indicators SET min_ref = 2, max_ref = 8, benchmark_target = 6 WHERE code = 'igma_ideb';
UPDATE public.indicators SET min_ref = 70, max_ref = 100, benchmark_target = 98 WHERE code = 'igma_taxa_escolarizacao';
UPDATE public.indicators SET min_ref = 30, max_ref = 100, benchmark_target = 80 WHERE code = 'igma_cobertura_saude';
UPDATE public.indicators SET min_ref = 0.5, max_ref = 6, benchmark_target = 3 WHERE code = 'igma_leitos_por_habitante';
UPDATE public.indicators SET min_ref = 0, max_ref = 10, benchmark_target = 2 WHERE code = 'igma_agencias_turismo';
UPDATE public.indicators SET min_ref = 0, max_ref = 50, benchmark_target = 10 WHERE code = 'igma_meios_hospedagem';
UPDATE public.indicators SET min_ref = 0, max_ref = 20, benchmark_target = 5 WHERE code = 'igma_guias_turismo';
UPDATE public.indicators SET min_ref = 0, max_ref = 5, benchmark_target = 2 WHERE code = 'igma_despesa_turismo';
UPDATE public.indicators SET min_ref = 5, max_ref = 70, benchmark_target = 30 WHERE code = 'igma_receita_propria';