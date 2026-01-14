
-- Fix the function to use correct type name
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  _user_id UUID,
  _system_access TEXT,
  _role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  -- Only the signed-in user can complete their own onboarding
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Basic input validation
  IF _system_access NOT IN ('ERP','EDU') THEN
    RAISE EXCEPTION 'invalid system access';
  END IF;

  IF _role NOT IN ('ADMIN','ANALYST','VIEWER','ESTUDANTE','PROFESSOR') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  -- Get user's org_id
  SELECT org_id INTO _org_id FROM public.profiles WHERE user_id = _user_id;
  IF _org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update profile with system access but keep pending_approval = true
  UPDATE public.profiles
  SET
    system_access = _system_access::public.system_access_type,
    pending_approval = true,
    approval_requested_at = COALESCE(approval_requested_at, now()),
    updated_at = now()
  WHERE user_id = _user_id;

  -- Set the user's role inside their org (admins can later adjust)
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::public.app_role)
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN true;
END;
$$;
