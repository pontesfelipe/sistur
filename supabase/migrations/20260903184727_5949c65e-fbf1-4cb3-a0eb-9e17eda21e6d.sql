DO $$ BEGIN
  CREATE TYPE public.org_kind_type AS ENUM ('PLATFORM','PUBLIC','ENTERPRISE','INDEPENDENT','PENDING','DEMO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS org_kind public.org_kind_type;

UPDATE public.orgs SET org_kind = CASE
  WHEN is_platform THEN 'PLATFORM'::public.org_kind_type
  WHEN is_demo THEN 'DEMO'::public.org_kind_type
  WHEN org_type::text = 'PUBLIC' THEN 'PUBLIC'::public.org_kind_type
  ELSE 'ENTERPRISE'::public.org_kind_type
END
WHERE org_kind IS NULL;

ALTER TABLE public.orgs ALTER COLUMN org_kind SET DEFAULT 'PENDING'::public.org_kind_type;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  audience text NOT NULL,
  description text,
  price_cents integer,
  currency text NOT NULL DEFAULT 'BRL',
  billing_period text NOT NULL DEFAULT 'monthly',
  seat_based boolean NOT NULL DEFAULT false,
  min_seats integer NOT NULL DEFAULT 1,
  quote_only boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "plans_admin_manage" ON public.plans;
CREATE POLICY "plans_admin_manage" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  seats integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at timestamptz,
  source text NOT NULL DEFAULT 'manual',
  provider_ref text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_owner_chk CHECK (org_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_read_own" ON public.subscriptions;
CREATE POLICY "subscriptions_read_own" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid())) OR public.has_role(auth.uid(), 'ADMIN'::app_role));
DROP POLICY IF EXISTS "subscriptions_admin_manage" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_manage" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid,
  feature text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  reason text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_overrides_target_chk CHECK (org_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_org ON public.entitlement_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_user ON public.entitlement_overrides(user_id);

GRANT SELECT ON public.entitlement_overrides TO authenticated;
GRANT ALL ON public.entitlement_overrides TO service_role;
ALTER TABLE public.entitlement_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entitlement_overrides_read_own" ON public.entitlement_overrides;
CREATE POLICY "entitlement_overrides_read_own" ON public.entitlement_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid())) OR public.has_role(auth.uid(), 'ADMIN'::app_role));
DROP POLICY IF EXISTS "entitlement_overrides_admin_manage" ON public.entitlement_overrides;
CREATE POLICY "entitlement_overrides_admin_manage" ON public.entitlement_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

INSERT INTO public.plans (code, version, name, audience, description, price_cents, billing_period, seat_based, min_seats, quote_only, features, sort_order)
VALUES
  ('territorial', 1, 'Territorial', 'PUBLIC', 'Gestão pública de destinos: diagnóstico territorial completo, projetos, relatórios e EDU.', NULL, 'annual', false, 1, true,
   '{"erp":true,"edu":true,"projects":true,"reports":true,"observatory":true,"consortia":true,"beni":true}'::jsonb, 10),
  ('empresarial', 1, 'Empresarial', 'ENTERPRISE', 'Diagnóstico empresarial por empreendimento/marca, com assentos por usuário (mínimo 5).', 19900, 'monthly', true, 5, false,
   '{"enterprise":true,"edu":true,"reports":true,"beni":true}'::jsonb, 20),
  ('estudante', 1, 'Estudante', 'STUDENT', 'Acesso à trilha formativa do SISTUR EDU.', 2900, 'monthly', false, 1, false,
   '{"edu":true,"beni":true}'::jsonb, 30),
  ('professor', 1, 'Professor', 'TEACHER', 'Gestão de turmas, trilhas e acompanhamento de estudantes.', 0, 'monthly', false, 1, false,
   '{"edu":true,"classrooms":true,"beni":true}'::jsonb, 40),
  ('independente', 1, 'Independente', 'INDEPENDENT', 'Consultores e profissionais autônomos: diagnóstico empresarial individual e EDU.', 9900, 'monthly', false, 1, false,
   '{"enterprise":true,"edu":true,"reports":true,"beni":true}'::jsonb, 50)
ON CONFLICT (code, version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_features jsonb := '{}'::jsonb;
  v_plan_code text;
  v_sub record;
  v_ovr record;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('plan', NULL, 'features', '{}'::jsonb, 'source', 'anonymous');
  END IF;

  SELECT org_id INTO v_org FROM public.profiles WHERE id = v_user;

  SELECT s.id, p.code AS plan_code, p.features AS plan_features
    INTO v_sub
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
    AND (s.user_id = v_user OR (v_org IS NOT NULL AND s.org_id = v_org))
  ORDER BY (s.user_id = v_user) DESC, s.started_at DESC
  LIMIT 1;

  IF v_sub.id IS NOT NULL THEN
    v_features := v_sub.plan_features;
    v_plan_code := v_sub.plan_code;
  END IF;

  FOR v_ovr IN
    SELECT feature, enabled FROM public.entitlement_overrides
    WHERE (expires_at IS NULL OR expires_at > now())
      AND (user_id = v_user OR (v_org IS NOT NULL AND org_id = v_org))
  LOOP
    v_features := v_features || jsonb_build_object(v_ovr.feature, v_ovr.enabled);
  END LOOP;

  RETURN jsonb_build_object(
    'plan', v_plan_code,
    'features', v_features,
    'org_id', v_org,
    'source', COALESCE(v_plan_code, 'none')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_entitlements() TO authenticated;