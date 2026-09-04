-- 1. Beni allowance: fallback para licenças legadas
CREATE OR REPLACE FUNCTION public._beni_resolve_allowance(_user_id uuid, _org_id uuid)
RETURNS TABLE(allowance integer, period text, is_trial boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota integer;
  v_legacy text;
BEGIN
  SELECT MAX(COALESCE((p.features->>'beni_monthly_quota')::integer, 30))
    INTO v_quota
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
    AND (s.user_id = _user_id OR (_org_id IS NOT NULL AND s.org_id = _org_id));

  IF v_quota IS NULL THEN
    SELECT l.plan::text INTO v_legacy
    FROM public.licenses l
    WHERE l.status = 'active'
      AND (l.expires_at IS NULL OR l.expires_at > now())
      AND (l.user_id = _user_id OR (_org_id IS NOT NULL AND l.org_id = _org_id))
    ORDER BY (l.user_id = _user_id) DESC, l.created_at DESC
    LIMIT 1;

    v_quota := CASE v_legacy
      WHEN 'enterprise' THEN 60
      WHEN 'pro' THEN 60
      WHEN 'basic' THEN 30
      WHEN 'estudante' THEN 30
      WHEN 'professor' THEN 30
      ELSE NULL
    END;
  END IF;

  IF v_quota IS NOT NULL THEN
    RETURN QUERY SELECT v_quota, to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM'), false;
  ELSE
    RETURN QUERY SELECT 10, 'trial', true;
  END IF;
END;
$$;

-- 2. Entitlements: corrige coluna profiles.user_id e adiciona fallback legado
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
  v_legacy text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('plan', NULL, 'features', '{}'::jsonb, 'source', 'anonymous');
  END IF;

  SELECT org_id INTO v_org FROM public.profiles WHERE user_id = v_user;

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

  -- Fallback: licenças do sistema anterior
  IF v_plan_code IS NULL THEN
    SELECT l.plan::text INTO v_legacy
    FROM public.licenses l
    WHERE l.status = 'active'
      AND (l.expires_at IS NULL OR l.expires_at > now())
      AND (l.user_id = v_user OR (v_org IS NOT NULL AND l.org_id = v_org))
    ORDER BY (l.user_id = v_user) DESC, l.created_at DESC
    LIMIT 1;

    IF v_legacy IS NOT NULL THEN
      SELECT p.features, p.code INTO v_features, v_plan_code
      FROM public.plans p
      WHERE p.is_active
        AND p.code = CASE v_legacy
          WHEN 'enterprise' THEN 'empresarial'
          WHEN 'pro' THEN 'territorial'
          WHEN 'basic' THEN 'territorial'
          WHEN 'estudante' THEN 'estudante'
          WHEN 'professor' THEN 'professor'
          ELSE NULL
        END
      LIMIT 1;
      v_features := COALESCE(v_features, '{}'::jsonb);
    END IF;
  END IF;

  IF v_plan_code IS NULL
     AND public.has_role(v_user, 'PROFESSOR')
     AND public.professor_qualifies_free_license(v_user) THEN
    SELECT p.features, p.code INTO v_features, v_plan_code
    FROM public.plans p
    WHERE p.code = 'professor' AND p.is_active
    LIMIT 1;
  END IF;

  v_features := COALESCE(v_features, '{}'::jsonb);

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

-- 3. Views públicas do fórum: rodam como owner para não exigir acesso direto a profiles
ALTER VIEW public.public_forum_posts_view SET (security_invoker = false);
ALTER VIEW public.public_forum_replies_view SET (security_invoker = false);