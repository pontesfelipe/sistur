-- ============================================================
-- SISTUR: Implementação dos Princípios de Mario Beni
-- Adiciona campos e estruturas para o motor de interpretação IGMA
-- ============================================================

-- 1. Adicionar campo next_review_recommended_at no assessments (REGRA 2)
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS next_review_recommended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS igma_flags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS igma_interpretation JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS marketing_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS externality_warning BOOLEAN DEFAULT false;

-- 2. Adicionar campo intersectoral_dependency nos indicators (REGRA 6)
ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS intersectoral_dependency BOOLEAN DEFAULT false;

-- 3. Criar tabela de histórico de flags IGMA para análise temporal
CREATE TABLE IF NOT EXISTS public.igma_interpretation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  pillar_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  flags TEXT[] NOT NULL DEFAULT '{}',
  allowed_actions TEXT[] NOT NULL DEFAULT '{}',
  blocked_actions TEXT[] NOT NULL DEFAULT '{}',
  ui_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  interpretation_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.igma_interpretation_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view IGMA history in their org"
ON public.igma_interpretation_history
FOR SELECT
USING (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert IGMA history in their org"
ON public.igma_interpretation_history
FOR INSERT
WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

-- 4. Adicionar indicadores intersetoriais conhecidos
-- (Indicadores que dependem de políticas fora do turismo: saúde, segurança, educação)
UPDATE public.indicators 
SET intersectoral_dependency = true
WHERE code IN (
  -- Saúde
  'SAUDE_LEITOS', 'SAUDE_UBS', 'SAUDE_COBERTURA', 'RA_SAUDE_01', 'RA_SAUDE_02',
  -- Segurança
  'SEG_OCORRENCIAS', 'SEG_VIOLENCIA', 'RA_SEGURANCA_01', 'RA_SEGURANCA_02',
  -- Educação
  'EDU_IDEB', 'EDU_ANALFABETISMO', 'RA_EDUCACAO_01', 'RA_EDUCACAO_02',
  -- Saneamento
  'SANEAMENTO_AGUA', 'SANEAMENTO_ESGOTO', 'RA_SANEAMENTO_01', 'RA_SANEAMENTO_02'
)
OR name ILIKE '%saúde%'
OR name ILIKE '%segurança%'
OR name ILIKE '%educação%'
OR name ILIKE '%saneamento%'
OR theme ILIKE '%social%';

-- 5. Comentários para documentação
COMMENT ON COLUMN public.assessments.next_review_recommended_at IS 'Data recomendada para próxima revisão do diagnóstico (Princípio Mario Beni: Planejamento Contínuo)';
COMMENT ON COLUMN public.assessments.igma_flags IS 'Flags do motor IGMA: RA_LIMITATION, GOVERNANCE_BLOCK, EXTERNALITY_WARNING, MARKETING_BLOCKED';
COMMENT ON COLUMN public.assessments.igma_interpretation IS 'Contexto completo da interpretação IGMA incluindo allowed_actions e ui_messages';
COMMENT ON COLUMN public.assessments.marketing_blocked IS 'Marketing bloqueado se RA ou AO críticos (Regra 5: Território antes do marketing)';
COMMENT ON COLUMN public.assessments.externality_warning IS 'Alerta de externalidade negativa: OE subindo enquanto RA desce (Regra 3)';
COMMENT ON COLUMN public.indicators.intersectoral_dependency IS 'Indicador depende de políticas intersetoriais fora do turismo (Regra 6)';