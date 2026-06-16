ALTER TABLE public.report_validations
  ADD COLUMN IF NOT EXISTS ai_validation_status text
    NOT NULL DEFAULT 'pending'
    CHECK (ai_validation_status IN ('pending', 'completed', 'failed', 'skipped'));

COMMENT ON COLUMN public.report_validations.ai_validation_status IS
  'Status do agente IA validador (pós-persistência): pending | completed | failed | skipped. v1.64.6+';

UPDATE public.report_validations
SET ai_validation_status = 'completed'
WHERE ai_validation_status = 'pending';