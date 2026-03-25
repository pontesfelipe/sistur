CREATE OR REPLACE FUNCTION public.activate_my_trial()
RETURNS public.licenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_license public.licenses%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.org_id
  INTO v_org_id
  FROM public.profiles p
  WHERE p.user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT *
  INTO v_license
  FROM public.licenses l
  WHERE l.user_id = v_user_id
  LIMIT 1;

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
    user_id,
    org_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    activated_at,
    expires_at,
    max_users,
    features,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_org_id,
    'trial',
    'active',
    now(),
    now() + INTERVAL '7 days',
    now(),
    NULL,
    1,
    jsonb_build_object(
      'erp', true,
      'edu', true,
      'games', true,
      'reports', false,
      'integrations', false
    ),
    now(),
    now()
  )
  RETURNING * INTO v_license;

  RETURN v_license;
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_my_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_my_trial() TO authenticated;