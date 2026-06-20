-- ===== ENUM canal =====
DO $$ BEGIN
  CREATE TYPE public.enterprise_channel_type AS ENUM ('DIRETO','OTA','AGENCIA','CORPORATIVO','EVENTOS','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Tabela: canais de distribuição =====
CREATE TABLE IF NOT EXISTS public.enterprise_distribution_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_type public.enterprise_channel_type NOT NULL DEFAULT 'OUTRO',
  share_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (share_pct >= 0 AND share_pct <= 100),
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  notes TEXT,
  period_start DATE,
  period_end DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_distribution_channels TO authenticated;
GRANT ALL ON public.enterprise_distribution_channels TO service_role;

ALTER TABLE public.enterprise_distribution_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edc_select_org" ON public.enterprise_distribution_channels
  FOR SELECT TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE POLICY "edc_modify_org" ON public.enterprise_distribution_channels
  FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE INDEX IF NOT EXISTS idx_edc_destination ON public.enterprise_distribution_channels(destination_id);
CREATE INDEX IF NOT EXISTS idx_edc_org ON public.enterprise_distribution_channels(org_id);

CREATE TRIGGER update_edc_updated_at
  BEFORE UPDATE ON public.enterprise_distribution_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Tabela: sazonalidade mensal =====
CREATE TABLE IF NOT EXISTS public.enterprise_seasonality_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  occupancy_rate NUMERIC(5,2) CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100),
  adr NUMERIC(12,2) CHECK (adr >= 0),
  revpar NUMERIC(12,2) CHECK (revpar >= 0),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (destination_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_seasonality_months TO authenticated;
GRANT ALL ON public.enterprise_seasonality_months TO service_role;

ALTER TABLE public.enterprise_seasonality_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esm_select_org" ON public.enterprise_seasonality_months
  FOR SELECT TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE POLICY "esm_modify_org" ON public.enterprise_seasonality_months
  FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE INDEX IF NOT EXISTS idx_esm_destination ON public.enterprise_seasonality_months(destination_id);
CREATE INDEX IF NOT EXISTS idx_esm_org ON public.enterprise_seasonality_months(org_id);

CREATE TRIGGER update_esm_updated_at
  BEFORE UPDATE ON public.enterprise_seasonality_months
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Novos indicadores Enterprise (Receita) =====
INSERT INTO public.indicators (code, name, pillar, theme, description, unit, direction, normalization, min_ref, max_ref, weight)
VALUES
  ('ENT_LTV',
   'Lifetime Value do Hóspede (LTV)',
   'OE','Saúde Financeira',
   'Valor médio total que um hóspede gera ao longo do relacionamento (R$). Calcula receita média × frequência × duração do relacionamento.',
   'R$','HIGH_IS_BETTER','MIN_MAX',500,10000,1.0),
  ('ENT_BREAKEVEN_OCC',
   'Breakeven de Ocupação',
   'OE','Saúde Financeira',
   'Taxa de ocupação mínima para cobrir custos fixos e variáveis. Quanto menor, maior a margem de segurança operacional.',
   '%','LOW_IS_BETTER','MIN_MAX',20,80,1.0),
  ('ENT_COMMISSION_AVG',
   'Comissão Média Ponderada',
   'OE','Saúde Financeira',
   'Comissão média paga aos canais, ponderada pela participação de cada canal nas reservas.',
   '%','LOW_IS_BETTER','MIN_MAX',5,25,1.0),
  ('ENT_DIRECT_SALES_PCT',
   '% Vendas Diretas (Derivado)',
   'AO','Efetividade de Marketing',
   'Participação de canais diretos (site próprio, telefone, walk-in) no total de reservas. Calculado automaticamente do mix de canais.',
   '%','HIGH_IS_BETTER','MIN_MAX',10,70,1.0),
  ('ENT_SEASONALITY_INDEX',
   'Índice de Sazonalidade',
   'AO','Taxa de Ocupação',
   'Coeficiente de variação da ocupação mensal (desvio padrão / média). Quanto menor, mais estável a demanda ao longo do ano.',
   'coeficiente','LOW_IS_BETTER','MIN_MAX',0.05,0.6,1.0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  direction = EXCLUDED.direction,
  min_ref = EXCLUDED.min_ref,
  max_ref = EXCLUDED.max_ref,
  pillar = EXCLUDED.pillar,
  theme = EXCLUDED.theme;