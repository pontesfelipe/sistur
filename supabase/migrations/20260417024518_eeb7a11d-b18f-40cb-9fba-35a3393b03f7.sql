-- Etapa B: Backup pesos originais + calibração para somar 1.0 por pilar
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS weight_legacy numeric;

-- Backup apenas se ainda não foi feito (idempotente)
UPDATE public.indicators
SET weight_legacy = weight
WHERE weight_legacy IS NULL;

-- Normaliza pesos para somar 1.0 por pilar, mantendo proporção relativa
WITH sums AS (
  SELECT pillar, SUM(weight) AS total
  FROM public.indicators
  WHERE pillar IN ('RA','OE','AO') AND weight > 0
  GROUP BY pillar
)
UPDATE public.indicators i
SET weight = ROUND((i.weight / s.total)::numeric, 6)
FROM sums s
WHERE i.pillar = s.pillar
  AND i.weight > 0;

COMMENT ON COLUMN public.indicators.weight IS
  'Peso normalizado: soma = 1.0 por pilar (proporção relativa). Documento FORMULAS_MATEMÁTICAS.docx Etapa 3.';
COMMENT ON COLUMN public.indicators.weight_legacy IS
  'Pesos originais antes da calibração (Etapa B v1.27.2). Mantido para auditoria.';