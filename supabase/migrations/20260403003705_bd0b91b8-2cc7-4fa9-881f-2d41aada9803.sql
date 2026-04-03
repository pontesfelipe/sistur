
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(_user_id uuid, _system_access text, _role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _org_id UUID;
  _current_pending BOOLEAN;
  _current_access system_access_type;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _system_access NOT IN ('ERP','EDU') THEN
    RAISE EXCEPTION 'invalid system access';
  END IF;

  IF _role NOT IN ('ADMIN','ANALYST','VIEWER','ESTUDANTE','PROFESSOR') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT org_id, pending_approval, system_access
  INTO _org_id, _current_pending, _current_access
  FROM public.profiles WHERE user_id = _user_id;

  IF _org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Prevent resubmission if already awaiting approval
  IF _current_pending = true AND _current_access IS NOT NULL THEN
    RAISE EXCEPTION 'Solicitação de acesso já foi enviada. Aguarde a aprovação do administrador.';
  END IF;

  UPDATE public.profiles
  SET
    system_access = _system_access::public.system_access_type,
    pending_approval = true,
    approval_requested_at = COALESCE(approval_requested_at, now()),
    updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::public.app_role)
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN true;
END;
$$;
