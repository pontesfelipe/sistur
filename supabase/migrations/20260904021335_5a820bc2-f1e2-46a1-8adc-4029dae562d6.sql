UPDATE public.plans SET features = features || '{"beni_monthly_quota":30}'::jsonb WHERE code IN ('territorial','estudante','professor','independente') AND NOT (features ? 'beni_monthly_quota');
UPDATE public.plans SET features = features || '{"beni_monthly_quota":60}'::jsonb WHERE code = 'empresarial' AND NOT (features ? 'beni_monthly_quota');
UPDATE public.plans SET price_cents = 14900 WHERE code = 'empresarial' AND version = 1;

CREATE TABLE IF NOT EXISTS public.beni_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  allowance integer NOT NULL DEFAULT 30,
  used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

GRANT SELECT ON public.beni_quotas TO authenticated;
GRANT ALL ON public.beni_quotas TO service_role;
ALTER TABLE public.beni_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beni_quotas_read_own" ON public.beni_quotas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TABLE IF NOT EXISTS public.beni_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  source text NOT NULL DEFAULT 'manual',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beni_credits_owner_chk CHECK (user_id IS NOT NULL OR org_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_beni_credits_user ON public.beni_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_beni_credits_org ON public.beni_credits(org_id);

GRANT SELECT ON public.beni_credits TO authenticated;
GRANT ALL ON public.beni_credits TO service_role;
ALTER TABLE public.beni_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beni_credits_read_own" ON public.beni_credits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid()))
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE TABLE IF NOT EXISTS public.beni_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  question_chars integer,
  model text,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beni_usage_log_user ON public.beni_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beni_usage_log_org ON public.beni_usage_log(org_id, created_at DESC);

GRANT SELECT ON public.beni_usage_log TO authenticated;
GRANT ALL ON public.beni_usage_log TO service_role;
ALTER TABLE public.beni_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beni_usage_log_read_own" ON public.beni_usage_log FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid())
        AND public.has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role))
    OR public.has_role(auth.uid(), 'ADMIN'::app_role)
  );

CREATE OR REPLACE FUNCTION public._beni_resolve_allowance(_user_id uuid, _org_id uuid)
RETURNS TABLE(allowance integer, period text, is_trial boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota integer;
BEGIN
  SELECT MAX(COALESCE((p.features->>'beni_monthly_quota')::integer, 30))
    INTO v_quota
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
    AND (s.user_id = _user_id OR (_org_id IS NOT NULL AND s.org_id = _org_id));

  IF v_quota IS NOT NULL THEN
    RETURN QUERY SELECT v_quota, to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM'), false;
  ELSE
    RETURN QUERY SELECT 10, 'trial', true;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._beni_resolve_allowance(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._beni_resolve_allowance(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_beni_token(_question_chars integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.consume_beni_token(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_beni_token(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.refund_beni_token()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_allowance integer;
  v_period text;
  v_is_trial boolean;
  v_updated integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('refunded', false);
  END IF;

  IF public.has_role(v_user, 'ADMIN'::app_role) THEN
    RETURN jsonb_build_object('refunded', true, 'note', 'admin_unlimited');
  END IF;

  v_org := public.get_effective_org_id();
  SELECT r.allowance, r.period, r.is_trial INTO v_allowance, v_period, v_is_trial
  FROM public._beni_resolve_allowance(v_user, v_org) r;

  UPDATE public.beni_quotas SET used = GREATEST(used - 1, 0), updated_at = now()
  WHERE user_id = v_user AND period = v_period AND used > 0;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    INSERT INTO public.beni_credits (user_id, balance, source, reason)
    VALUES (v_user, 1, 'refund', 'Estorno por falha na geracao da resposta');
  END IF;

  INSERT INTO public.beni_usage_log (user_id, org_id, source)
  VALUES (v_user, v_org, 'refunded');

  RETURN jsonb_build_object('refunded', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_beni_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_beni_token() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_beni_balance()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_beni_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_beni_balance() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_beni_credits(
  _target_user uuid DEFAULT NULL,
  _target_org uuid DEFAULT NULL,
  _amount integer DEFAULT 0,
  _source text DEFAULT 'manual',
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  INSERT INTO public.beni_credits (user_id, org_id, balance, source, reason, created_by)
  VALUES (_target_user, _target_org, _amount, COALESCE(_source, 'manual'), _reason, auth.uid());

  RETURN jsonb_build_object('granted', true, 'amount', _amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_beni_credits(uuid, uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_beni_credits(uuid, uuid, integer, text, text) TO authenticated;