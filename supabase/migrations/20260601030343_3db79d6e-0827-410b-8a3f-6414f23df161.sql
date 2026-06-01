DROP TABLE IF EXISTS public.destination_certifications CASCADE;

DO $$ BEGIN
  CREATE TYPE public.certification_level AS ENUM ('bronze', 'prata', 'ouro', 'diamante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.certification_status AS ENUM ('ativo', 'expirado', 'revogado', 'suspenso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.destination_certification_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.certification_level NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  min_overall_score NUMERIC(5,2) NOT NULL,
  min_ra_score NUMERIC(5,2) NOT NULL,
  min_oe_score NUMERIC(5,2) NOT NULL,
  min_ao_score NUMERIC(5,2) NOT NULL,
  validity_months INTEGER NOT NULL DEFAULT 12,
  badge_color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.destination_certification_levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_certification_levels TO authenticated;
GRANT ALL ON public.destination_certification_levels TO service_role;

ALTER TABLE public.destination_certification_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active certification levels"
  ON public.destination_certification_levels FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Only admins can manage certification levels"
  ON public.destination_certification_levels FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TABLE public.destination_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  level public.certification_level NOT NULL,
  status public.certification_status NOT NULL DEFAULT 'ativo',
  verification_code TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  issued_by UUID REFERENCES auth.users(id),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  overall_score_snapshot NUMERIC(5,2),
  ra_score_snapshot NUMERIC(5,2),
  oe_score_snapshot NUMERIC(5,2),
  ao_score_snapshot NUMERIC(5,2),
  criteria_snapshot JSONB,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dest_cert_org ON public.destination_certifications(org_id);
CREATE INDEX idx_dest_cert_status ON public.destination_certifications(status);
CREATE INDEX idx_dest_cert_code ON public.destination_certifications(verification_code);
CREATE INDEX idx_dest_cert_valid_until ON public.destination_certifications(valid_until);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_certifications TO authenticated;
GRANT ALL ON public.destination_certifications TO service_role;

ALTER TABLE public.destination_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their certifications"
  ON public.destination_certifications FOR SELECT
  USING (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR org_id IN (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Only admins can manage certifications"
  ON public.destination_certifications FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER trg_dest_cert_levels_updated_at
  BEFORE UPDATE ON public.destination_certification_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_dest_cert_updated_at
  BEFORE UPDATE ON public.destination_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.verify_destination_certification(_code TEXT)
RETURNS TABLE (
  verification_code TEXT,
  org_name TEXT,
  level public.certification_level,
  level_display_name TEXT,
  status public.certification_status,
  issued_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_valid BOOLEAN,
  overall_score NUMERIC,
  ra_score NUMERIC,
  oe_score NUMERIC,
  ao_score NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.verification_code,
    o.name,
    c.level,
    l.display_name,
    c.status,
    c.issued_at,
    c.valid_until,
    (c.status = 'ativo' AND c.valid_until > now()),
    c.overall_score_snapshot,
    c.ra_score_snapshot,
    c.oe_score_snapshot,
    c.ao_score_snapshot
  FROM public.destination_certifications c
  JOIN public.orgs o ON o.id = c.org_id
  LEFT JOIN public.destination_certification_levels l ON l.level = c.level
  WHERE c.verification_code = _code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_destination_certification(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.evaluate_destination_certification_eligibility(_org_id UUID)
RETURNS TABLE (
  eligible_level public.certification_level,
  overall_score NUMERIC,
  ra_score NUMERIC,
  oe_score NUMERIC,
  ao_score NUMERIC,
  assessment_id UUID,
  details JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_assessment_id UUID;
  v_overall NUMERIC := 0;
  v_ra NUMERIC := 0;
  v_oe NUMERIC := 0;
  v_ao NUMERIC := 0;
  v_level RECORD;
  v_eligible public.certification_level;
BEGIN
  SELECT a.id, COALESCE(a.final_score, 0)
    INTO v_assessment_id, v_overall
    FROM public.assessments a
   WHERE a.org_id = _org_id
     AND a.calculated_at IS NOT NULL
   ORDER BY a.calculated_at DESC
   LIMIT 1;

  IF v_assessment_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(CASE WHEN ps.pillar::text = 'RA' THEN ps.score END), 0),
         COALESCE(MAX(CASE WHEN ps.pillar::text = 'OE' THEN ps.score END), 0),
         COALESCE(MAX(CASE WHEN ps.pillar::text = 'AO' THEN ps.score END), 0)
    INTO v_ra, v_oe, v_ao
    FROM public.pillar_scores ps
   WHERE ps.assessment_id = v_assessment_id;

  FOR v_level IN
    SELECT * FROM public.destination_certification_levels
     WHERE active = true
     ORDER BY sort_order DESC, min_overall_score DESC
  LOOP
    IF v_overall >= v_level.min_overall_score
       AND v_ra >= v_level.min_ra_score
       AND v_oe >= v_level.min_oe_score
       AND v_ao >= v_level.min_ao_score THEN
      v_eligible := v_level.level;
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_eligible, v_overall, v_ra, v_oe, v_ao, v_assessment_id,
    jsonb_build_object(
      'evaluated_at', now(),
      'thresholds_checked', (SELECT jsonb_agg(row_to_json(l)) FROM public.destination_certification_levels l WHERE active = true)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_destination_certification_eligibility(UUID) TO authenticated, service_role;

INSERT INTO public.destination_certification_levels
  (level, display_name, description, min_overall_score, min_ra_score, min_oe_score, min_ao_score, validity_months, badge_color, sort_order)
VALUES
  ('bronze',   'Selo Bronze SISTUR',   'Destino com base estrutural mínima reconhecida.',           50, 45, 45, 45, 12, '#CD7F32', 1),
  ('prata',    'Selo Prata SISTUR',    'Destino com governança e operação consolidadas.',           67, 60, 60, 60, 18, '#C0C0C0', 2),
  ('ouro',     'Selo Ouro SISTUR',     'Destino de referência sistêmica em RA/OE/AO.',              80, 75, 75, 75, 24, '#FFD700', 3),
  ('diamante', 'Selo Diamante SISTUR', 'Destino de excelência integral, modelo de referência.',     90, 85, 85, 85, 36, '#B9F2FF', 4)
ON CONFLICT (level) DO NOTHING;