-- Add territorial interpretation enum
CREATE TYPE public.territorial_interpretation AS ENUM ('ESTRUTURAL', 'GESTAO', 'ENTREGA');

-- Add interpretation column to issues table
ALTER TABLE public.issues ADD COLUMN interpretation public.territorial_interpretation;

-- Add comment explaining the interpretation types
COMMENT ON COLUMN public.issues.interpretation IS 'Territorial interpretation: ESTRUTURAL (structural/historical constraints), GESTAO (governance/planning failures), ENTREGA (execution/delivery failures)';