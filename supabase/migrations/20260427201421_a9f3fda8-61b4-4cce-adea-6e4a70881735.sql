-- 1. Pillar weights per organization
CREATE TABLE IF NOT EXISTS public.org_pillar_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('RA', 'OE', 'AO')),
  weight NUMERIC NOT NULL CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (org_id, pillar)
);

ALTER TABLE public.org_pillar_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins read own pillar weights"
ON public.org_pillar_weights FOR SELECT
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND profiles.org_id = org_pillar_weights.org_id)
);

CREATE POLICY "Org admins manage own pillar weights"
ON public.org_pillar_weights FOR ALL
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
);

-- 2. Indicator weight overrides per organization
CREATE TABLE IF NOT EXISTS public.org_indicator_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL CHECK (weight >= 0 AND weight <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (org_id, indicator_id)
);

ALTER TABLE public.org_indicator_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins read own indicator weights"
ON public.org_indicator_weights FOR SELECT
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND profiles.org_id = org_indicator_weights.org_id)
);

CREATE POLICY "Org admins manage own indicator weights"
ON public.org_indicator_weights FOR ALL
USING (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'ADMIN'::app_role)
  OR public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_org_indicator_weights_org ON public.org_indicator_weights(org_id);

-- 3. updated_at trigger
CREATE TRIGGER trg_org_pillar_weights_updated
BEFORE UPDATE ON public.org_pillar_weights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_org_indicator_weights_updated
BEFORE UPDATE ON public.org_indicator_weights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RPC: get effective pillar weights (returns defaults if not customized)
CREATE OR REPLACE FUNCTION public.get_org_pillar_weights(p_org_id UUID)
RETURNS TABLE(pillar TEXT, weight NUMERIC, is_custom BOOLEAN)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH defaults(pillar, weight) AS (
    VALUES ('RA'::text, 0.35::numeric), ('OE', 0.30), ('AO', 0.35)
  )
  SELECT
    d.pillar,
    COALESCE(w.weight, d.weight) AS weight,
    (w.weight IS NOT NULL) AS is_custom
  FROM defaults d
  LEFT JOIN public.org_pillar_weights w
    ON w.org_id = p_org_id AND w.pillar = d.pillar
  ORDER BY CASE d.pillar WHEN 'RA' THEN 1 WHEN 'OE' THEN 2 ELSE 3 END;
END;
$$;

-- 5. RPC: set pillar weights (atomic, validates sum)
CREATE OR REPLACE FUNCTION public.set_org_pillar_weights(
  p_org_id UUID,
  p_ra NUMERIC,
  p_oe NUMERIC,
  p_ao NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum NUMERIC;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role_in_org(auth.uid(), p_org_id, 'ORG_ADMIN'::app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_sum := p_ra + p_oe + p_ao;
  IF v_sum < 0.99 OR v_sum > 1.01 THEN
    RAISE EXCEPTION 'pillar_weights_must_sum_to_1 (got %)', v_sum;
  END IF;

  INSERT INTO public.org_pillar_weights (org_id, pillar, weight, updated_by)
  VALUES (p_org_id, 'RA', p_ra, auth.uid())
  ON CONFLICT (org_id, pillar) DO UPDATE SET weight = EXCLUDED.weight, updated_by = auth.uid();

  INSERT INTO public.org_pillar_weights (org_id, pillar, weight, updated_by)
  VALUES (p_org_id, 'OE', p_oe, auth.uid())
  ON CONFLICT (org_id, pillar) DO UPDATE SET weight = EXCLUDED.weight, updated_by = auth.uid();

  INSERT INTO public.org_pillar_weights (org_id, pillar, weight, updated_by)
  VALUES (p_org_id, 'AO', p_ao, auth.uid())
  ON CONFLICT (org_id, pillar) DO UPDATE SET weight = EXCLUDED.weight, updated_by = auth.uid();

  -- Mark all calculated assessments of this org as needing recalculation
  UPDATE public.assessments
  SET needs_recalculation = true, data_updated_at = now()
  WHERE org_id = p_org_id AND calculated_at IS NOT NULL AND needs_recalculation = false;
END;
$$;

-- 6. RPC: reset pillar weights to defaults
CREATE OR REPLACE FUNCTION public.reset_org_pillar_weights(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role_in_org(auth.uid(), p_org_id, 'ORG_ADMIN'::app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.org_pillar_weights WHERE org_id = p_org_id;

  UPDATE public.assessments
  SET needs_recalculation = true, data_updated_at = now()
  WHERE org_id = p_org_id AND calculated_at IS NOT NULL AND needs_recalculation = false;
END;
$$;

-- 7. RPC: set / clear indicator weight override
CREATE OR REPLACE FUNCTION public.set_org_indicator_weight(
  p_org_id UUID,
  p_indicator_id UUID,
  p_weight NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role_in_org(auth.uid(), p_org_id, 'ORG_ADMIN'::app_role)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_weight IS NULL THEN
    DELETE FROM public.org_indicator_weights
    WHERE org_id = p_org_id AND indicator_id = p_indicator_id;
  ELSE
    INSERT INTO public.org_indicator_weights (org_id, indicator_id, weight, updated_by)
    VALUES (p_org_id, p_indicator_id, p_weight, auth.uid())
    ON CONFLICT (org_id, indicator_id) DO UPDATE SET weight = EXCLUDED.weight, updated_by = auth.uid();
  END IF;

  UPDATE public.assessments
  SET needs_recalculation = true, data_updated_at = now()
  WHERE org_id = p_org_id AND calculated_at IS NOT NULL AND needs_recalculation = false;
END;
$$;

-- 8. RPC: list effective indicator weights for an org (with overrides flagged)
CREATE OR REPLACE FUNCTION public.get_org_indicator_weights(p_org_id UUID)
RETURNS TABLE(
  indicator_id UUID,
  code TEXT,
  name TEXT,
  pillar TEXT,
  default_weight NUMERIC,
  effective_weight NUMERIC,
  is_overridden BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.code,
    i.name,
    i.pillar::text,
    i.weight AS default_weight,
    COALESCE(o.weight, i.weight) AS effective_weight,
    (o.weight IS NOT NULL) AS is_overridden
  FROM public.indicators i
  LEFT JOIN public.org_indicator_weights o
    ON o.indicator_id = i.id AND o.org_id = p_org_id
  WHERE i.is_active = true
  ORDER BY i.pillar, i.code;
END;
$$;