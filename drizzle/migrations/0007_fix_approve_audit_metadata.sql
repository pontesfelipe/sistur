CREATE OR REPLACE FUNCTION public.admin_approve_access_request(_user_id uuid, _role text DEFAULT NULL::text, _org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _current_org uuid;
  _temp_org uuid;
  _target_org uuid;
  _access system_access_type;
  _final_role app_role;
BEGIN
  IF NOT public.has_role(_caller, 'ADMIN'::app_role)
     AND NOT public.has_role(_caller, 'ORG_ADMIN'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT org_id, system_access INTO _current_org, _access
  FROM public.profiles WHERE user_id = _user_id;

  IF _current_org IS NULL THEN
    RAISE EXCEPTION 'perfil não encontrado';
  END IF;

  SELECT id INTO _temp_org FROM public.orgs WHERE name = 'Temporário' LIMIT 1;

  _target_org := COALESCE(_org_id, _current_org);

  IF _target_org = _temp_org THEN
    SELECT id INTO _target_org FROM public.orgs WHERE name = 'Autônomo' ORDER BY created_at LIMIT 1;
    IF _target_org IS NULL THEN
      INSERT INTO public.orgs (name) VALUES ('Autônomo') RETURNING id INTO _target_org;
    END IF;
  END IF;

  IF NOT public.has_role(_caller, 'ADMIN'::app_role) THEN
    IF NOT public.has_role_in_org(_caller, _target_org, 'ORG_ADMIN'::app_role) THEN
      RAISE EXCEPTION 'not authorized for this organization';
    END IF;
  END IF;

  _final_role := COALESCE(
    NULLIF(_role, '')::app_role,
    CASE WHEN _access = 'EDU'::system_access_type THEN 'ESTUDANTE'::app_role ELSE 'VIEWER'::app_role END
  );

  IF _final_role IN ('ADMIN'::app_role, 'ORG_ADMIN'::app_role) THEN
    RAISE EXCEPTION 'papéis privilegiados não podem ser concedidos na aprovação';
  END IF;

  UPDATE public.profiles
  SET org_id = _target_org,
      pending_approval = false,
      updated_at = now()
  WHERE user_id = _user_id;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND org_id <> _target_org;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _target_org, _final_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.audit_events (org_id, user_id, event_type, entity_type, entity_id, metadata)
  VALUES (_target_org, _caller, 'USER_APPROVED', 'user', _user_id, jsonb_build_object('target_user', _user_id, 'role', _final_role));

  RETURN true;
END;
$function$;