
-- License plans enum
CREATE TYPE public.license_plan_type AS ENUM ('trial', 'estudante', 'professor', 'basic', 'pro', 'enterprise');
CREATE TYPE public.license_status_type AS ENUM ('active', 'expired', 'cancelled', 'suspended');

-- Org license quotas: how many licenses of each plan an org can distribute
CREATE TABLE public.org_license_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  plan license_plan_type NOT NULL,
  max_licenses INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, plan)
);

-- User licenses: each user must have one active license
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  plan license_plan_type NOT NULL DEFAULT 'trial',
  status license_status_type NOT NULL DEFAULT 'active',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  max_users INT NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_license_quotas ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own license
CREATE POLICY "Users can read own license"
  ON public.licenses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: admins can read all licenses
CREATE POLICY "Admins can read all licenses"
  ON public.licenses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS: admins can insert licenses
CREATE POLICY "Admins can insert licenses"
  ON public.licenses FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- RLS: admins can update licenses
CREATE POLICY "Admins can update licenses"
  ON public.licenses FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS: admins can delete licenses
CREATE POLICY "Admins can delete licenses"
  ON public.licenses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS: org_license_quotas - admins only
CREATE POLICY "Admins can manage org quotas"
  ON public.org_license_quotas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- Function to check org quota usage
CREATE OR REPLACE FUNCTION public.get_org_license_usage(p_org_id UUID, p_plan license_plan_type)
RETURNS TABLE(quota INT, used INT, available INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_quota INT;
  v_used INT;
BEGIN
  SELECT COALESCE(max_licenses, 0) INTO v_quota
  FROM org_license_quotas
  WHERE org_id = p_org_id AND plan = p_plan;

  IF v_quota IS NULL THEN v_quota := 0; END IF;

  SELECT COUNT(*)::INT INTO v_used
  FROM licenses
  WHERE org_id = p_org_id AND plan = p_plan AND status = 'active';

  RETURN QUERY SELECT v_quota, v_used, (v_quota - v_used);
END;
$$;

-- Auto-create trial license on user signup via trigger
CREATE OR REPLACE FUNCTION public.auto_create_trial_license()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.licenses (user_id, org_id, plan, status, trial_started_at, trial_ends_at, features)
  VALUES (
    NEW.user_id,
    NEW.org_id,
    'trial',
    'active',
    now(),
    now() + INTERVAL '7 days',
    '{"erp": true, "edu": true, "games": true, "reports": false, "integrations": false}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_trial_license
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_trial_license();

-- Expire trial licenses function
CREATE OR REPLACE FUNCTION public.expire_trial_licenses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.licenses
  SET status = 'expired', updated_at = now()
  WHERE plan = 'trial'
    AND status = 'active'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now();
END;
$$;

-- Seed: Give existing ADMIN users perpetual active 'enterprise' licenses
INSERT INTO public.licenses (user_id, org_id, plan, status, activated_at, expires_at, features)
SELECT
  p.user_id,
  p.org_id,
  'enterprise'::license_plan_type,
  'active'::license_status_type,
  now(),
  NULL,
  '{"erp": true, "edu": true, "games": true, "reports": true, "integrations": true}'::jsonb
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'ADMIN'
  AND p.pending_approval = false
ON CONFLICT (user_id) DO NOTHING;

-- Seed: Give other existing approved users annual active 'basic' licenses
INSERT INTO public.licenses (user_id, org_id, plan, status, activated_at, expires_at, features)
SELECT
  p.user_id,
  p.org_id,
  'basic'::license_plan_type,
  'active'::license_status_type,
  now(),
  now() + INTERVAL '1 year',
  '{"erp": true, "edu": true, "games": true, "reports": true, "integrations": false}'::jsonb
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.pending_approval = false
  AND (ur.role IS NULL OR ur.role != 'ADMIN')
ON CONFLICT (user_id) DO NOTHING;

-- Set unlimited quotas for SISTUR org
INSERT INTO public.org_license_quotas (org_id, plan, max_licenses, notes)
SELECT '5d08593f-6f82-4737-857b-070f0fc1fe90', plan, 999, 'Organização principal - sem limite'
FROM unnest(ARRAY['trial', 'estudante', 'professor', 'basic', 'pro', 'enterprise']::license_plan_type[]) AS plan
ON CONFLICT (org_id, plan) DO NOTHING;
