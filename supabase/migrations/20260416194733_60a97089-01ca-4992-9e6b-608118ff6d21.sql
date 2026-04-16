UPDATE public.indicators
SET indicator_scope = 'enterprise'
WHERE code IN (
  'ENT_REVIEW_SCORE',
  'ENT_NPS',
  'ENT_HORAS_TREINO',
  'ENT_FORNECEDORES_LOCAIS',
  'ENT_EMPREGO_LOCAL',
  'ENT_CERTIFICACAO_AMB'
) AND indicator_scope = 'both';