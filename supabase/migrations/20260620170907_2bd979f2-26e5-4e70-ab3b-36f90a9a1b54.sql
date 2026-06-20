-- ===== Tabela: snapshots de reviews =====
CREATE TABLE IF NOT EXISTS public.enterprise_review_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 10),
  review_volume INTEGER CHECK (review_volume >= 0),
  response_rate NUMERIC(5,2) CHECK (response_rate >= 0 AND response_rate <= 100),
  sentiment_positive_pct NUMERIC(5,2) CHECK (sentiment_positive_pct >= 0 AND sentiment_positive_pct <= 100),
  raw_data JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_review_snapshots TO authenticated;
GRANT ALL ON public.enterprise_review_snapshots TO service_role;

ALTER TABLE public.enterprise_review_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ers_select_org" ON public.enterprise_review_snapshots
  FOR SELECT TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE POLICY "ers_modify_org" ON public.enterprise_review_snapshots
  FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE INDEX IF NOT EXISTS idx_ers_destination ON public.enterprise_review_snapshots(destination_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ers_org ON public.enterprise_review_snapshots(org_id);

CREATE TRIGGER update_ers_updated_at
  BEFORE UPDATE ON public.enterprise_review_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Tabela: concorrentes =====
CREATE TABLE IF NOT EXISTS public.enterprise_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  property_type TEXT,
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 10),
  review_volume INTEGER CHECK (review_volume >= 0),
  distance_km NUMERIC(6,2),
  source_url TEXT,
  source_name TEXT,
  notes TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_competitors TO authenticated;
GRANT ALL ON public.enterprise_competitors TO service_role;

ALTER TABLE public.enterprise_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ec_select_org" ON public.enterprise_competitors
  FOR SELECT TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE POLICY "ec_modify_org" ON public.enterprise_competitors
  FOR ALL TO authenticated
  USING (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'))
  WITH CHECK (org_id = public.get_effective_org_id() OR public.has_role(auth.uid(),'ADMIN'));

CREATE INDEX IF NOT EXISTS idx_ec_destination ON public.enterprise_competitors(destination_id);
CREATE INDEX IF NOT EXISTS idx_ec_org ON public.enterprise_competitors(org_id);

CREATE TRIGGER update_ec_updated_at
  BEFORE UPDATE ON public.enterprise_competitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Novo indicador derivado: ENT_COMP_GAP =====
INSERT INTO public.indicators (code, name, pillar, theme, description, unit, direction, normalization, min_ref, max_ref, weight)
VALUES
  ('ENT_COMP_GAP',
   'Gap Competitivo de Reputação',
   'AO','Satisfação do Hóspede',
   'Diferença entre a nota média própria e a média dos concorrentes capturados. Valores positivos indicam vantagem competitiva.',
   'pontos','HIGH_IS_BETTER','MIN_MAX',-2,2,1.0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  direction = EXCLUDED.direction,
  min_ref = EXCLUDED.min_ref,
  max_ref = EXCLUDED.max_ref,
  pillar = EXCLUDED.pillar,
  theme = EXCLUDED.theme;