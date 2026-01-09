-- =====================================================================
-- MIGRATION: Aderência Metodológica Completa (Relatório 2026-01-09)
-- =====================================================================

-- 1) Adicionar colunas ra_limitation e governance_block em assessments (Seção 3.2)
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS ra_limitation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS governance_block boolean DEFAULT false;

-- 2) Criar tabela de regras de composição de indicadores (Seção 4.1)
CREATE TABLE IF NOT EXISTS public.igma_composite_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  composite_code TEXT NOT NULL,
  component_code TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  transform TEXT NOT NULL DEFAULT 'NORMAL' CHECK (transform IN ('NORMAL', 'INVERT', 'LOG', 'SQRT')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(composite_code, component_code)
);

-- Enable RLS
ALTER TABLE public.igma_composite_rules ENABLE ROW LEVEL SECURITY;

-- Public read policy (indicators are system-wide)
CREATE POLICY "Composite rules are viewable by authenticated users"
ON public.igma_composite_rules
FOR SELECT
USING (auth.role() = 'authenticated');

-- 3) Criar tabela action_plans para fechar ciclo ERP (Seção 4.4)
CREATE TABLE IF NOT EXISTS public.action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority INTEGER DEFAULT 1,
  pillar TEXT CHECK (pillar IN ('RA', 'OE', 'AO')),
  linked_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  linked_prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  completion_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for action_plans
CREATE POLICY "Users can view action plans from their org"
ON public.action_plans
FOR SELECT
USING (public.user_belongs_to_org(org_id, auth.uid()));

CREATE POLICY "Users can create action plans in their org"
ON public.action_plans
FOR INSERT
WITH CHECK (public.user_belongs_to_org(org_id, auth.uid()));

CREATE POLICY "Users can update action plans in their org"
ON public.action_plans
FOR UPDATE
USING (public.user_belongs_to_org(org_id, auth.uid()));

CREATE POLICY "Users can delete action plans in their org"
ON public.action_plans
FOR DELETE
USING (public.user_belongs_to_org(org_id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_action_plans_updated_at
BEFORE UPDATE ON public.action_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Adicionar unique constraint na coluna code de indicators se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'indicators_code_key' AND conrelid = 'public.indicators'::regclass
  ) THEN
    ALTER TABLE public.indicators ADD CONSTRAINT indicators_code_key UNIQUE (code);
  END IF;
END $$;

-- 5) Inserir indicador composto I_SEMT (Seção 4.1)
INSERT INTO public.indicators (
  code,
  name,
  description,
  pillar,
  theme,
  direction,
  normalization,
  min_ref,
  max_ref,
  weight,
  igma_dimension,
  source,
  notes
) VALUES (
  'igma_isemt',
  'Índice de Sustentabilidade Econômica do Mercado Turístico (I_SEMT)',
  'Índice composto que avalia a sustentabilidade econômica do mercado turístico, integrando indicadores de poder de compra, intensidade turística e pressão de demanda, conforme metodologia proprietária.',
  'OE',
  'Mercado',
  'HIGH_IS_BETTER',
  'MIN_MAX',
  0,
  100,
  1.5,
  'Socioeconômico',
  'SISTUR Metodologia Proprietária',
  'Índice composto calculado automaticamente. Componentes: IPCR (Poder de Compra Relativo), IIET (Intensidade Econômica do Turismo), IPTL (Pressão Turística Local - invertido). Fórmula: I_SEMT = (w1*IPCR + w2*IIET + w3*(1-IPTL)) / (w1+w2+w3). Alerta de overtourism quando IPTL > threshold.'
) ON CONFLICT (code) DO NOTHING;

-- 6) Inserir componentes do I_SEMT
INSERT INTO public.indicators (code, name, description, pillar, theme, direction, normalization, min_ref, max_ref, weight, igma_dimension, source, notes)
VALUES 
  ('igma_ipcr', 'Índice de Poder de Compra Relativo (IPCR)', 'Mede o poder aquisitivo do turista em relação ao custo de vida local', 'OE', 'Mercado', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 100, 1.0, 'Socioeconômico', 'SISTUR Metodologia Proprietária', 'Componente do I_SEMT'),
  ('igma_iiet', 'Índice de Intensidade Econômica do Turismo (IIET)', 'Mede a contribuição do turismo para a economia local', 'OE', 'Mercado', 'HIGH_IS_BETTER', 'MIN_MAX', 0, 100, 1.0, 'Socioeconômico', 'SISTUR Metodologia Proprietária', 'Componente do I_SEMT'),
  ('igma_iptl', 'Índice de Pressão Turística Local (IPTL)', 'Mede a pressão do turismo sobre recursos locais (overtourism)', 'RA', 'Sustentabilidade', 'LOW_IS_BETTER', 'MIN_MAX', 0, 100, 1.0, 'Sustentabilidade', 'SISTUR Metodologia Proprietária', 'Componente do I_SEMT - invertido na composição. Valores altos indicam risco de overtourism.')
ON CONFLICT (code) DO NOTHING;

-- 7) Inserir regras de composição do I_SEMT
INSERT INTO public.igma_composite_rules (composite_code, component_code, weight, transform)
VALUES 
  ('igma_isemt', 'igma_ipcr', 1.0, 'NORMAL'),
  ('igma_isemt', 'igma_iiet', 1.0, 'NORMAL'),
  ('igma_isemt', 'igma_iptl', 1.0, 'INVERT')
ON CONFLICT (composite_code, component_code) DO NOTHING;

-- 8) Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_action_plans_assessment_id ON public.action_plans(assessment_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_org_id ON public.action_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_igma_composite_rules_composite_code ON public.igma_composite_rules(composite_code);