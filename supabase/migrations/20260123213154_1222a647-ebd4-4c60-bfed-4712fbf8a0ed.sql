-- Adicionar indicador faltante para OE - Saúde Financeira (tier SMALL para balancear)
INSERT INTO enterprise_indicators (
  code, name, description, pillar, category_id, 
  benchmark_min, benchmark_max, benchmark_target, 
  unit, weight, minimum_tier, collection_frequency, is_active
)
SELECT 
  'ENT_GOP',
  'GOP (Gross Operating Profit)',
  'Lucro operacional bruto como percentual da receita total',
  'OE',
  id,
  10, -- benchmark_min
  60, -- benchmark_max
  40, -- benchmark_target
  '%',
  1.0,
  'SMALL',
  'monthly',
  true
FROM enterprise_indicator_categories 
WHERE code = 'OE_FINANCEIRO'
ON CONFLICT (code) DO NOTHING;