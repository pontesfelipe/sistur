
CREATE TABLE IF NOT EXISTS public.beni_unlimited_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  reason text,
  campaign text,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beni_unlimited_target_chk CHECK (user_id IS NOT NULL OR org_id IS NOT NULL)
);

GRANT SELECT ON public.beni_unlimited_grants TO authenticated;
GRANT ALL ON public.beni_unlimited_grants TO service_role;

ALTER TABLE public.beni_unlimited_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage beni unlimited grants"
ON public.beni_unlimited_grants FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users view own beni unlimited grants"
ON public.beni_unlimited_grants FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_beni_unlimited_updated_at
BEFORE UPDATE ON public.beni_unlimited_grants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_beni_unlimited_user ON public.beni_unlimited_grants(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_beni_unlimited_org ON public.beni_unlimited_grants(org_id) WHERE revoked_at IS NULL;

ALTER TABLE public.beni_credits ADD COLUMN IF NOT EXISTS campaign text;

-- Helper: is there an active unlimited grant?
CREATE OR REPLACE FUNCTION public._beni_has_unlimited(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beni_unlimited_grants g
    WHERE g.revoked_at IS NULL
      AND g.starts_at <= now()
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND (g.user_id = _user_id OR (_org_id IS NOT NULL AND g.org_id = _org_id))
  );
$$;

-- Grant unlimited access
CREATE OR REPLACE FUNCTION public.admin_grant_beni_unlimited(
  _target_user uuid DEFAULT NULL,
  _target_org uuid DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _reason text DEFAULT NULL,
  _campaign text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'Somente ADMIN pode conceder acesso ilimitado';
  END IF;
  IF _target_user IS NULL AND _target_org IS NULL THEN
    RAISE EXCEPTION 'missing_target';
  END IF;

  INSERT INTO public.beni_unlimited_grants (user_id, org_id, expires_at, reason, campaign, created_by)
  VALUES (_target_user, _target_org, _expires_at, _reason, _campaign, auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('granted', true, 'id', v_id, 'expires_at', _expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_beni_unlimited(_grant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.beni_unlimited_grants SET revoked_at = now() WHERE id = _grant_id AND revoked_at IS NULL;
  RETURN jsonb_build_object('revoked', true);
END;
$$;

-- Extend credit grant with custom expiry + campaign
CREATE OR REPLACE FUNCTION public.admin_grant_beni_credits(
  _target_user uuid DEFAULT NULL,
  _target_org uuid DEFAULT NULL,
  _amount integer DEFAULT 0,
  _source text DEFAULT 'manual',
  _reason text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _campaign text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'Somente ADMIN pode conceder creditos';
  END IF;
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF _target_user IS NULL AND _target_org IS NULL THEN
    RAISE EXCEPTION 'missing_target';
  END IF;

  INSERT INTO public.beni_credits (user_id, org_id, balance, source, reason, campaign, created_by, expires_at)
  VALUES (_target_user, _target_org, _amount, COALESCE(_source, 'manual'), _reason, _campaign, auth.uid(),
          COALESCE(_expires_at, now() + interval '12 months'));

  RETURN jsonb_build_object('granted', true, 'amount', _amount);
END;
$$;

-- Recognize unlimited grants when consuming
CREATE OR REPLACE FUNCTION public.consume_beni_token(_question_chars integer DEFAULT NULL::integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_allowance integer;
  v_period text;
  v_is_trial boolean;
  v_quota public.beni_quotas%ROWTYPE;
  v_credit public.beni_credits%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  v_org := public.get_effective_org_id();

  IF public.has_role(v_user, 'ADMIN'::app_role) THEN
    INSERT INTO public.beni_usage_log (user_id, org_id, question_chars, source)
    VALUES (v_user, v_org, _question_chars, 'admin_unlimited');
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'source', 'admin_unlimited');
  END IF;

  IF public._beni_has_unlimited(v_user, v_org) THEN
    INSERT INTO public.beni_usage_log (user_id, org_id, question_chars, source)
    VALUES (v_user, v_org, _question_chars, 'unlimited_grant');
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'source', 'unlimited_grant');
  END IF;

  SELECT r.allowance, r.period, r.is_trial
    INTO v_allowance, v_period, v_is_trial
  FROM public._beni_resolve_allowance(v_user, v_org) r;

  INSERT INTO public.beni_quotas (user_id, period, allowance, used)
  VALUES (v_user, v_period, v_allowance, 0)
  ON CONFLICT (user_id, period) DO NOTHING;

  SELECT * INTO v_quota FROM public.beni_quotas
  WHERE user_id = v_user AND period = v_period
  FOR UPDATE;

  IF v_quota.allowance <> v_allowance THEN
    UPDATE public.beni_quotas SET allowance = v_allowance, updated_at = now()
    WHERE id = v_quota.id;
  END IF;

  IF v_quota.used < v_allowance THEN
    UPDATE public.beni_quotas SET used = used + 1, updated_at = now()
    WHERE id = v_quota.id;
    INSERT INTO public.beni_usage_log (user_id, org_id, question_chars, source)
    VALUES (v_user, v_org, _question_chars, CASE WHEN v_is_trial THEN 'trial_quota' ELSE 'monthly_quota' END);
    RETURN jsonb_build_object(
      'allowed', true,
      'source', CASE WHEN v_is_trial THEN 'trial_quota' ELSE 'monthly_quota' END,
      'is_trial', v_is_trial,
      'remaining_monthly', v_allowance - v_quota.used - 1,
      'allowance', v_allowance
    );
  END IF;

  SELECT * INTO v_credit FROM public.beni_credits
  WHERE user_id = v_user AND balance > 0 AND expires_at > now()
  ORDER BY expires_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_credit.id IS NOT NULL THEN
    UPDATE public.beni_credits SET balance = balance - 1 WHERE id = v_credit.id;
    INSERT INTO public.beni_usage_log (user_id, org_id, question_chars, source)
    VALUES (v_user, v_org, _question_chars, 'user_credits');
    RETURN jsonb_build_object('allowed', true, 'source', 'user_credits', 'is_trial', v_is_trial, 'remaining_monthly', 0);
  END IF;

  IF v_org IS NOT NULL THEN
    SELECT * INTO v_credit FROM public.beni_credits
    WHERE org_id = v_org AND balance > 0 AND expires_at > now()
    ORDER BY expires_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_credit.id IS NOT NULL THEN
      UPDATE public.beni_credits SET balance = balance - 1 WHERE id = v_credit.id;
      INSERT INTO public.beni_usage_log (user_id, org_id, question_chars, source)
      VALUES (v_user, v_org, _question_chars, 'org_credits');
      RETURN jsonb_build_object('allowed', true, 'source', 'org_credits', 'is_trial', v_is_trial, 'remaining_monthly', 0);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'beni_quota_exceeded',
    'is_trial', v_is_trial,
    'allowance', v_allowance,
    'remaining_monthly', 0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_beni_balance()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_allowance integer;
  v_period text;
  v_is_trial boolean;
  v_used integer := 0;
  v_user_credits integer := 0;
  v_org_credits integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  IF public.has_role(v_user, 'ADMIN'::app_role) THEN
    RETURN jsonb_build_object('authenticated', true, 'unlimited', true, 'is_trial', false);
  END IF;

  v_org := public.get_effective_org_id();

  IF public._beni_has_unlimited(v_user, v_org) THEN
    RETURN jsonb_build_object('authenticated', true, 'unlimited', true, 'is_trial', false, 'source', 'unlimited_grant');
  END IF;

  SELECT r.allowance, r.period, r.is_trial INTO v_allowance, v_period, v_is_trial
  FROM public._beni_resolve_allowance(v_user, v_org) r;

  SELECT used INTO v_used FROM public.beni_quotas
  WHERE user_id = v_user AND period = v_period;

  SELECT COALESCE(SUM(balance), 0) INTO v_user_credits
  FROM public.beni_credits
  WHERE user_id = v_user AND expires_at > now();

  IF v_org IS NOT NULL THEN
    SELECT COALESCE(SUM(balance), 0) INTO v_org_credits
    FROM public.beni_credits
    WHERE org_id = v_org AND expires_at > now();
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'unlimited', false,
    'is_trial', v_is_trial,
    'allowance', v_allowance,
    'used', COALESCE(v_used, 0),
    'remaining_monthly', GREATEST(v_allowance - COALESCE(v_used, 0), 0),
    'user_credits', v_user_credits,
    'org_credits', v_org_credits,
    'period', v_period
  );
END;
$function$;

-- Admin overview per user
CREATE OR REPLACE FUNCTION public.admin_beni_overview(_search text DEFAULT NULL, _limit integer DEFAULT 200)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  org_id uuid,
  org_name text,
  period text,
  allowance integer,
  used integer,
  user_credits integer,
  org_credits integer,
  unlimited boolean,
  unlimited_expires_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_period text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    u.email::text,
    p.org_id,
    o.name,
    v_period,
    COALESCE(q.allowance, 0),
    COALESCE(q.used, 0),
    COALESCE((SELECT SUM(c.balance)::int FROM public.beni_credits c WHERE c.user_id = p.user_id AND c.expires_at > now()), 0),
    COALESCE((SELECT SUM(c.balance)::int FROM public.beni_credits c WHERE c.org_id = p.org_id AND c.expires_at > now()), 0),
    public._beni_has_unlimited(p.user_id, p.org_id) OR public.has_role(p.user_id, 'ADMIN'::app_role),
    (SELECT MAX(g.expires_at) FROM public.beni_unlimited_grants g
      WHERE g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > now())
        AND (g.user_id = p.user_id OR (p.org_id IS NOT NULL AND g.org_id = p.org_id)))
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.orgs o ON o.id = p.org_id
  LEFT JOIN public.beni_quotas q ON q.user_id = p.user_id AND q.period = v_period
  WHERE _search IS NULL OR _search = ''
     OR p.full_name ILIKE '%' || _search || '%'
     OR u.email ILIKE '%' || _search || '%'
     OR o.name ILIKE '%' || _search || '%'
  ORDER BY COALESCE(q.used, 0) DESC, p.full_name NULLS LAST
  LIMIT GREATEST(COALESCE(_limit, 200), 1);
END;
$$;
