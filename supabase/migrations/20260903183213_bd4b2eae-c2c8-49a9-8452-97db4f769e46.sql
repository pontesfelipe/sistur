-- ============ FASE 0: HARDENING DE ACESSOS ============

-- 1) Caller confiável (autenticado ou service role)
CREATE OR REPLACE FUNCTION public.is_trusted_caller()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
      OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      OR coalesce(current_setting('role', true), '') = 'service_role'
$$;

-- 2) Organização de plataforma
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;
UPDATE public.orgs SET is_platform = true WHERE id = '5d08593f-6f82-4737-857b-070f0fc1fe90';

CREATE OR REPLACE FUNCTION public.is_sistur_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    JOIN public.orgs o ON o.id = p.org_id
    WHERE p.user_id = _user_id
      AND ur.role = 'ADMIN'
      AND o.is_platform = true
  )
$$;

-- 3) Bloqueio real de usuários
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_reason text;

-- 4) Funções de permissão seguras para chamadas anônimas
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND org_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'ORG_ADMIN'
  )
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND blocked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT org_id FROM public.profiles
  WHERE user_id = _user_id AND public.is_trusted_caller()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_system_access(_user_id uuid, _access system_access_type)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND (system_access = _access OR system_access IS NULL)
      AND pending_approval = false
      AND blocked_at IS NULL
  )
$$;

-- 5) Perfis: escrita restrita
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safe fields" ON public.profiles;

CREATE POLICY "Users can update own profile safe fields"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

REVOKE INSERT, DELETE, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, forum_show_identity, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 6) user_roles: leitura própria/da org, escrita só ADMIN
DROP POLICY IF EXISTS "Admins can manage roles in their org" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their org" ON public.user_roles;

CREATE POLICY "Users can view own or org roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Platform admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_privileged_role_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE(NEW.role, OLD.role);

  IF _role IN ('ADMIN'::app_role, 'ORG_ADMIN'::app_role) THEN
    IF auth.uid() IS NULL THEN
      RETURN COALESCE(NEW, OLD); -- service role / rotinas internas
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'::app_role
    ) THEN
      RAISE EXCEPTION 'somente administradores de plataforma podem conceder ADMIN ou ORG_ADMIN';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_privileged_role_grants ON public.user_roles;
CREATE TRIGGER enforce_privileged_role_grants
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_privileged_role_grants();

-- 7) Onboarding: sem auto-promoção
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

  IF _system_access = 'ERP' AND _role <> 'VIEWER' THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  IF _system_access = 'EDU' AND _role NOT IN ('ESTUDANTE','PROFESSOR') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT org_id, pending_approval, system_access
  INTO _org_id, _current_pending, _current_access
  FROM public.profiles WHERE user_id = _user_id;

  IF _org_id IS NULL THEN
    RETURN false;
  END IF;

  IF _current_pending = true AND _current_access IS NOT NULL THEN
    RAISE EXCEPTION 'Solicitação de acesso já foi enviada. Aguarde a aprovação do administrador.';
  END IF;

  UPDATE public.profiles
  SET system_access = _system_access::public.system_access_type,
      pending_approval = true,
      approval_requested_at = COALESCE(approval_requested_at, now()),
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _role::public.app_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN true;
END;
$$;

-- 8) Aprovação administrativa em uma operação
CREATE OR REPLACE FUNCTION public.admin_approve_access_request(_user_id uuid, _role text DEFAULT NULL, _org_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- ORG_ADMIN só aprova dentro da própria organização
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

  INSERT INTO public.audit_events (org_id, user_id, event_type, payload)
  VALUES (_target_org, _caller, 'USER_APPROVED', jsonb_build_object('target_user', _user_id, 'role', _final_role));

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.admin_approve_access_request(_user_id, NULL, NULL)
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_access_request(uuid, text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_access_request(uuid, text, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_trusted_caller() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_trusted_caller() TO authenticated, service_role;