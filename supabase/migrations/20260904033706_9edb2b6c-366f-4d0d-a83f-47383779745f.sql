create or replace function public.get_my_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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

  -- Professor com 5+ estudantes indicados ativos tem o plano Professor gratuito
  IF v_sub.id IS NULL
     AND public.has_role(v_user, 'PROFESSOR')
     AND public.professor_qualifies_free_license(v_user) THEN
    SELECT p.features, p.code INTO v_features, v_plan_code
    FROM public.plans p
    WHERE p.code = 'professor' AND p.is_active
    LIMIT 1;
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