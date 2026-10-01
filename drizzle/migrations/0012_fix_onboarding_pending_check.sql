CREATE OR REPLACE FUNCTION public.complete_user_onboarding(_user_id uuid, _system_access text, _role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id UUID;
  _current_pending BOOLEAN;
  _current_access system_access_type;
  _current_requested_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Module choice removed from signup (v2.24.0): _system_access may be NULL.
  IF _system_access IS NOT NULL THEN
    IF _system_access NOT IN ('ERP','EDU') THEN
      RAISE EXCEPTION 'invalid system access';
    END IF;
    IF _system_access = 'ERP' AND _role <> 'VIEWER' THEN
      RAISE EXCEPTION 'invalid role';
    END IF;
    IF _system_access = 'EDU' AND _role NOT IN ('ESTUDANTE','PROFESSOR') THEN
      RAISE EXCEPTION 'invalid role';
    END IF;
  END IF;

  _role := COALESCE(_role, 'VIEWER');

  IF _role NOT IN ('VIEWER','ANALYST','ESTUDANTE','PROFESSOR') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT org_id, pending_approval, system_access, approval_requested_at
  INTO _org_id, _current_pending, _current_access, _current_requested_at
  FROM public.profiles WHERE user_id = _user_id;

  IF _org_id IS NULL THEN
    RETURN false;
  END IF;

  IF _current_pending = true AND _current_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'Solicitação de acesso já foi enviada. Aguarde a aprovação do administrador.';
  END IF;

  UPDATE public.profiles
  SET system_access = COALESCE(_system_access::public.system_access_type, system_access),
      pending_approval = true,
      approval_requested_at = COALESCE(approval_requested_at, now()),
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::public.app_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN true;
END;
$function$;