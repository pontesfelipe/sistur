-- get_my_entitlements: honor the free-trial license (plan 'trial') so that
-- users who activate the limited free trial get their module flags (erp/edu/games)
-- from the license row itself. Paid plans keep resolving through public.plans.
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
  v_legacy record;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('plan', NULL, 'features', '{}'::jsonb, 'source', 'anonymous');
  END IF;

  SELECT org_id INTO v_org FROM public.profiles WHERE user_id = v_user;

  SELECT s.id, p.code AS plan_code, p.features AS plan_features INTO v_sub
  FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > now())
    AND (s.user_id = v_user OR (v_org IS NOT NULL AND s.org_id = v_org))
  ORDER BY (s.user_id = v_user) DESC, s.started_at DESC LIMIT 1;

  IF v_sub.id IS NOT NULL THEN
    v_features := v_sub.plan_features;
    v_plan_code := v_sub.plan_code;
  END IF;

  IF v_plan_code IS NULL THEN
    SELECT l.plan::text AS plan, l.features AS features, l.trial_ends_at AS trial_ends_at
    INTO v_legacy
    FROM public.licenses l
    WHERE l.status = 'active' AND (l.expires_at IS NULL OR l.expires_at > now())
      AND (l.user_id = v_user OR (v_org IS NOT NULL AND l.org_id = v_org))
    ORDER BY (l.user_id = v_user) DESC, l.created_at DESC LIMIT 1;

    IF v_legacy.plan IS NOT NULL THEN
      IF v_legacy.plan = 'trial' THEN
        -- Free trial: features come straight from the license row, and only
        -- while the trial window is still open.
        IF v_legacy.trial_ends_at IS NOT NULL AND v_legacy.trial_ends_at > now() THEN
          v_features := COALESCE(v_legacy.features, '{}'::jsonb);
          v_plan_code := 'trial';
        END IF;
      ELSE
        SELECT p.features, p.code INTO v_features, v_plan_code FROM public.plans p
        WHERE p.is_active AND p.code = CASE v_legacy.plan
            WHEN 'enterprise' THEN 'empresarial' WHEN 'pro' THEN 'territorial'
            WHEN 'estudante' THEN 'estudante' WHEN 'professor' THEN 'professor' ELSE NULL END
        LIMIT 1;
        v_features := COALESCE(v_features, '{}'::jsonb);
      END IF;
    END IF;
  END IF;

  IF v_plan_code IS NULL AND public.has_role(v_user, 'PROFESSOR') AND public.professor_qualifies_free_license(v_user) THEN
    SELECT p.features, p.code INTO v_features, v_plan_code FROM public.plans p
    WHERE p.code = 'professor' AND p.is_active LIMIT 1;
  END IF;

  v_features := COALESCE(v_features, '{}'::jsonb);

  FOR v_ovr IN SELECT feature, enabled FROM public.entitlement_overrides
    WHERE (expires_at IS NULL OR expires_at > now()) AND (user_id = v_user OR (v_org IS NOT NULL AND org_id = v_org))
  LOOP
    v_features := v_features || jsonb_build_object(v_ovr.feature, v_ovr.enabled);
  END LOOP;

  RETURN jsonb_build_object('plan', v_plan_code, 'features', v_features, 'org_id', v_org, 'source', COALESCE(v_plan_code, 'none'));
END;
$$;

-- activate_my_trial: idempotent activation of the limited free trial.
-- Returns the license row; raises when a paid license exists or the trial was used.
CREATE OR REPLACE FUNCTION public.activate_my_trial()
RETURNS public.licenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_license public.licenses%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.org_id INTO v_org_id FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT * INTO v_license FROM public.licenses l WHERE l.user_id = v_user_id LIMIT 1;

  IF FOUND THEN
    IF v_license.plan <> 'trial' THEN
      RAISE EXCEPTION 'paid_license_exists';
    END IF;
    IF v_license.status = 'active'
      AND (v_license.trial_ends_at IS NULL OR v_license.trial_ends_at > now()) THEN
      RETURN v_license;
    END IF;
    RAISE EXCEPTION 'trial_already_used';
  END IF;

  INSERT INTO public.licenses (
    user_id, org_id, plan, status, trial_started_at, trial_ends_at,
    activated_at, expires_at, max_users, features, notes, created_at, updated_at
  ) VALUES (
    v_user_id, v_org_id, 'trial', 'active', now(), now() + INTERVAL '7 days',
    now(), NULL, 1,
    jsonb_build_object(
      'erp', true, 'edu', true, 'games', true, 'beni', true,
      'enterprise', true, 'projects', false, 'reports', false,
      'observatory', false, 'consortia', false, 'integrations', false
    ),
    'Degustação gratuita ativada pelo usuário',
    now(), now()
  )
  RETURNING * INTO v_license;

  RETURN v_license;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_my_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_my_trial() TO authenticated, service_role;
