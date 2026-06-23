
-- =====================================================
-- 1) assessments.brand_id (referência opcional à marca)
-- =====================================================
ALTER TABLE public.assessments
  ADD COLUMN brand_id uuid REFERENCES public.enterprise_brands(id) ON DELETE SET NULL;

CREATE INDEX idx_assessments_brand ON public.assessments(brand_id) WHERE brand_id IS NOT NULL;

-- =====================================================
-- 2) assessment_units: 1 linha por unidade no diagnóstico
-- =====================================================
CREATE TABLE public.assessment_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  enterprise_profile_id uuid REFERENCES public.enterprise_profiles(id) ON DELETE SET NULL,
  unit_name text,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','data_ready','calculated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, destination_id)
);

-- Só uma unidade principal por assessment
CREATE UNIQUE INDEX uniq_assessment_units_primary
  ON public.assessment_units(assessment_id)
  WHERE is_primary;

CREATE INDEX idx_assessment_units_assessment ON public.assessment_units(assessment_id);
CREATE INDEX idx_assessment_units_destination ON public.assessment_units(destination_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_units TO authenticated;
GRANT ALL ON public.assessment_units TO service_role;

ALTER TABLE public.assessment_units ENABLE ROW LEVEL SECURITY;

-- Reuso do escopo do próprio assessment: usuário só vê unidades de
-- assessments que ele já enxerga pelas policies de `assessments`.
CREATE POLICY "Members can view units of accessible assessments"
  ON public.assessment_units FOR SELECT TO authenticated
  USING (
    assessment_id IN (SELECT id FROM public.assessments)
  );

CREATE POLICY "Members can insert units in their org assessments"
  ON public.assessment_units FOR INSERT TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM public.assessments a
      WHERE a.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
        UNION
        SELECT p.viewing_demo_org_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.viewing_demo_org_id IS NOT NULL
      )
      OR public.has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

CREATE POLICY "Members can update units of their org assessments"
  ON public.assessment_units FOR UPDATE TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM public.assessments a
      WHERE a.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

CREATE POLICY "Members can delete units of their org assessments"
  ON public.assessment_units FOR DELETE TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM public.assessments a
      WHERE a.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'ADMIN'::app_role)
    )
  );

CREATE TRIGGER trg_assessment_units_updated_at
  BEFORE UPDATE ON public.assessment_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3) indicator_values.unit_id (opcional) e índice único
-- =====================================================
ALTER TABLE public.indicator_values
  ADD COLUMN unit_id uuid REFERENCES public.assessment_units(id) ON DELETE CASCADE;

-- Mantém o conflict legado quando unit_id IS NULL (single-unit / territorial).
-- Adiciona um índice único separado para multi-unit (unit_id IS NOT NULL).
CREATE UNIQUE INDEX uniq_indicator_values_assessment_indicator_unit
  ON public.indicator_values(assessment_id, indicator_id, unit_id)
  WHERE unit_id IS NOT NULL;

CREATE INDEX idx_indicator_values_unit ON public.indicator_values(unit_id) WHERE unit_id IS NOT NULL;

-- =====================================================
-- 4) enterprise_indicator_values.unit_id (mesma ideia)
-- =====================================================
ALTER TABLE public.enterprise_indicator_values
  ADD COLUMN unit_id uuid REFERENCES public.assessment_units(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX uniq_enterprise_indicator_values_assessment_indicator_unit
  ON public.enterprise_indicator_values(assessment_id, indicator_id, unit_id)
  WHERE unit_id IS NOT NULL;

CREATE INDEX idx_enterprise_indicator_values_unit
  ON public.enterprise_indicator_values(unit_id) WHERE unit_id IS NOT NULL;
