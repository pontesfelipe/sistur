-- =============================================================================
-- SISTUR: RBAC hardening — users, roles, access and permissions review (Sep 2026)
-- =============================================================================
-- Companion document: docs/security/rbac.md
--
-- Access model enforced by this migration:
--   * ADMIN      = platform administrator (global, org-agnostic). Only an ADMIN
--                  can grant ADMIN / ORG_ADMIN (trigger-enforced).
--   * ORG_ADMIN  = tenant administrator; manages users of its own org through
--                  the `manage-users` edge function (service role).
--   * ANALYST / VIEWER  = Analítico (ERP) tenant roles.
--   * PROFESSOR / ESTUDANTE = EDU tenant roles.
--   * Self-onboarding can only request VIEWER / ESTUDANTE / PROFESSOR.
--   * profiles.org_id, pending_approval, system_access and blocked_at are
--     server-controlled columns (column-level grants), never client-writable.
--
-- Every statement is idempotent so the file can be re-applied safely.

-- -----------------------------------------------------------------------------
-- 0. Helpers
-- -----------------------------------------------------------------------------
-- True for an authenticated user request or for a service-role request.
-- Anonymous callers get `false`, which the role helpers below use to avoid
-- leaking role / org membership by user id to unauthenticated clients.
CREATE OR REPLACE FUNCTION public.is_trusted_caller()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL OR COALESCE(auth.role(), '') = 'service_role';
$$;

GRANT EXECUTE ON FUNCTION public.is_trusted_caller() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Platform admin definition (replaces the hard-coded org UUID)
-- -----------------------------------------------------------------------------
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

-- Preserve the org previously hard-coded in is_sistur_admin(); fall back to the
-- org named "SISTUR" when that UUID does not exist in this environment.
UPDATE public.orgs SET is_platform = true WHERE id = '5d08593f-6f82-4737-857b-070f0fc1fe90';
UPDATE public.orgs SET is_platform = true
 WHERE name = 'SISTUR'
   AND NOT EXISTS (SELECT 1 FROM public.orgs WHERE is_platform);

CREATE OR REPLACE FUNCTION public.is_sistur_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      JOIN public.orgs o ON o.id = p.org_id
     WHERE p.user_id = _user_id
       AND ur.role = 'ADMIN'::public.app_role
       AND o.is_platform
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Blocked-user state (separate from pending approval)
-- -----------------------------------------------------------------------------
-- Until now "blocking" a user re-flagged pending_approval = true, which hid the
-- user from the members list and showed them the "awaiting approval" screen.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_reason text;

-- -----------------------------------------------------------------------------
-- 3. Role / org helpers: anonymous-safe, and membership requires an
--    approved, non-blocked profile
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'ORG_ADMIN'::public.app_role
  );
$$;

-- has_role_in_org exists with two argument orders in different environments
-- (uuid, app_role, uuid) and (uuid, uuid, app_role). Replace whichever exists;
-- never create a second overload (PostgREST cannot disambiguate same-named args).
DO $$
BEGIN
  IF to_regprocedure('public.has_role_in_org(uuid, public.app_role, uuid)') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _role public.app_role, _org_id uuid)
      RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $b$
        SELECT public.is_trusted_caller() AND EXISTS (
          SELECT 1 FROM public.user_roles
           WHERE user_id = _user_id AND role = _role AND org_id = _org_id
        );
      $b$;
    $f$;
  END IF;

  IF to_regprocedure('public.has_role_in_org(uuid, uuid, public.app_role)') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, _role public.app_role)
      RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $b$
        SELECT public.is_trusted_caller() AND EXISTS (
          SELECT 1 FROM public.user_roles
           WHERE user_id = _user_id AND role = _role AND org_id = _org_id
        );
      $b$;
    $f$;
  END IF;
END $$;

-- Membership now means: approved and not blocked. Pending users no longer see
-- the shared "Temporário" org data; blocked users lose tenant access even while
-- an already-issued JWT is still valid.
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.profiles
     WHERE user_id = _user_id
       AND org_id = _org_id
       AND COALESCE(pending_approval, false) = false
       AND blocked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles
   WHERE user_id = _user_id AND public.is_trusted_caller()
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_system_access(_user_id uuid, _access public.system_access_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_trusted_caller() AND EXISTS (
    SELECT 1 FROM public.profiles
     WHERE user_id = _user_id
       AND (system_access = _access OR system_access IS NULL)
       AND COALESCE(pending_approval, false) = false
       AND blocked_at IS NULL
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. profiles: server-controlled columns
-- -----------------------------------------------------------------------------
-- Root cause of the critical findings: the self-update policy was row-scoped
-- only, so any user could PATCH pending_approval=false (self-approval) or
-- org_id=<any org> (tenant hop). Profiles are created by the auth trigger and
-- deleted by the service role only; INSERT/DELETE are removed from clients.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, forum_show_identity, updated_at)
   ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
REVOKE ALL ON public.profiles FROM anon;

-- Row-level policies stay: users update their own row, admins rows of their org.
DROP POLICY IF EXISTS "Users can update own profile safe fields" ON public.profiles;
CREATE POLICY "Users can update own profile safe fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. user_roles: platform admins manage, members read
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.user_roles FROM anon;

DROP POLICY IF EXISTS "Users can view roles in their org" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles and roles in their org" ON public.user_roles;
CREATE POLICY "Users can view own roles and roles in their org"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_belongs_to_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins can manage roles in their org" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage roles" ON public.user_roles;
CREATE POLICY "Platform admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- Defense in depth: privileged roles (ADMIN, ORG_ADMIN) can only be granted,
-- changed or removed by a platform ADMIN or by the service role (no JWT
-- subject). This holds even inside SECURITY DEFINER functions, because
-- auth.uid() still identifies the end user who triggered the call.
CREATE OR REPLACE FUNCTION public.enforce_privileged_role_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_is_admin boolean;
BEGIN
  IF _caller IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _caller AND role = 'ADMIN'::public.app_role
  ) INTO _caller_is_admin;

  IF _caller_is_admin THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.role IN ('ADMIN', 'ORG_ADMIN') THEN
    RAISE EXCEPTION 'rbac: only a platform admin can grant role %', NEW.role
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.role IN ('ADMIN', 'ORG_ADMIN') THEN
    RAISE EXCEPTION 'rbac: only a platform admin can change or remove role %', OLD.role
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_privileged_role_grants ON public.user_roles;
CREATE TRIGGER enforce_privileged_role_grants
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_privileged_role_grants();

-- -----------------------------------------------------------------------------
-- 6. Self-onboarding: single, correct definition
-- -----------------------------------------------------------------------------
-- The repository carried two competing definitions: one accepted 'ADMIN' from
-- the client (self-promotion to platform admin), the other cast to a type
-- (`public.user_role`) that does not exist. This is the canonical version.
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  _user_id uuid,
  _system_access text,
  _role text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _current_pending boolean;
  _current_access public.system_access_type;
  _blocked timestamptz;
  _existing_role public.app_role;
  _new_role public.app_role;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF _system_access NOT IN ('ERP', 'EDU') THEN
    RAISE EXCEPTION 'invalid system access';
  END IF;

  -- Self-service can only request non-privileged roles that match the system.
  IF _system_access = 'EDU' AND _role NOT IN ('ESTUDANTE', 'PROFESSOR') THEN
    RAISE EXCEPTION 'invalid role for EDU self-onboarding';
  END IF;
  IF _system_access = 'ERP' AND _role <> 'VIEWER' THEN
    RAISE EXCEPTION 'invalid role for Analítico self-onboarding';
  END IF;
  _new_role := _role::public.app_role;

  SELECT org_id, pending_approval, system_access, blocked_at
    INTO _org_id, _current_pending, _current_access, _blocked
    FROM public.profiles WHERE user_id = _user_id;

  IF _org_id IS NULL THEN
    RETURN false;
  END IF;

  IF _blocked IS NOT NULL THEN
    RAISE EXCEPTION 'account blocked' USING ERRCODE = '42501';
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

  -- Never downgrade a role an admin granted out of band.
  SELECT role INTO _existing_role
    FROM public.user_roles
   WHERE user_id = _user_id AND org_id = _org_id;

  IF _existing_role IN ('ADMIN', 'ORG_ADMIN', 'ANALYST') THEN
    RETURN true;
  END IF;

  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _org_id, _new_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_user_onboarding(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_user_onboarding(uuid, text, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Access-request approval as a single server-side operation
-- -----------------------------------------------------------------------------
-- The approval panel used to write profiles + user_roles straight from the
-- browser. With the column lockdown above that path is closed, and it never
-- worked across orgs anyway (the admin is not a member of "Temporário").
CREATE OR REPLACE FUNCTION public.admin_approve_access_request(
  _user_id uuid,
  _role public.app_role DEFAULT NULL,
  _org_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _current_org uuid;
  _system public.system_access_type;
  _temp_org uuid;
  _target_org uuid;
  _existing_role public.app_role;
  _final_role public.app_role;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF _role = 'ADMIN'::public.app_role THEN
    RAISE EXCEPTION 'rbac: ADMIN cannot be granted through access approval';
  END IF;

  SELECT org_id, system_access INTO _current_org, _system
    FROM public.profiles WHERE user_id = _user_id;
  IF _current_org IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT id INTO _temp_org FROM public.orgs WHERE name = 'Temporário' ORDER BY created_at LIMIT 1;

  IF _org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.orgs WHERE id = _org_id) THEN
      RAISE EXCEPTION 'org_not_found';
    END IF;
    _target_org := _org_id;
  ELSIF _temp_org IS NOT NULL AND _current_org = _temp_org THEN
    SELECT id INTO _target_org FROM public.orgs WHERE name = 'Autônomo' ORDER BY created_at LIMIT 1;
    IF _target_org IS NULL THEN
      INSERT INTO public.orgs (name) VALUES ('Autônomo') RETURNING id INTO _target_org;
    END IF;
  ELSE
    _target_org := _current_org;
  END IF;

  SELECT role INTO _existing_role
    FROM public.user_roles WHERE user_id = _user_id
   ORDER BY (org_id = _current_org) DESC LIMIT 1;

  _final_role := COALESCE(
    _role,
    _existing_role,
    CASE WHEN _system = 'EDU'::public.system_access_type
         THEN 'ESTUDANTE'::public.app_role ELSE 'VIEWER'::public.app_role END
  );

  UPDATE public.profiles
     SET org_id = _target_org,
         pending_approval = false,
         blocked_at = NULL,
         blocked_reason = NULL,
         updated_at = now()
   WHERE user_id = _user_id;

  -- A user has exactly one membership: drop stale rows, upsert the target one.
  DELETE FROM public.user_roles WHERE user_id = _user_id AND org_id <> _target_org;
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (_user_id, _target_org, _final_role)
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.licenses SET org_id = _target_org, updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.audit_events (org_id, user_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    _target_org, _caller, 'USER_ACCESS_APPROVED', 'user', _user_id,
    jsonb_build_object('role', _final_role, 'from_org_id', _current_org)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_access_request(uuid, public.app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_access_request(uuid, public.app_role, uuid) TO authenticated, service_role;

-- Backwards-compatible wrapper (keeps the historical "returns false when not
-- admin" contract).
CREATE OR REPLACE FUNCTION public.admin_approve_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.admin_approve_access_request(_user_id, NULL, NULL);
EXCEPTION WHEN insufficient_privilege THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_user(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8. Admin-only RPCs are not callable anonymously
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated, service_role;
