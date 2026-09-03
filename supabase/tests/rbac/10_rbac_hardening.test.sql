\set ON_ERROR_STOP on
\set QUIET on
CREATE OR REPLACE FUNCTION pg_temp.expect(_label text, _ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT COALESCE(_ok, false) THEN RAISE EXCEPTION 'FAIL: %', _label; END IF;
  RAISE NOTICE 'ok - %', _label;
END $$;
-- helper: run a statement as a JWT user and return whether it raised the expected sqlstate
CREATE OR REPLACE FUNCTION pg_temp.fails_with(_sql text, _sqlstate text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE _sql;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '   caught %: %', SQLSTATE, SQLERRM;
  RETURN SQLSTATE = _sqlstate;
END $$;

-- A sloppy SECURITY DEFINER function (simulates a future regression) that grants ADMIN to the caller
CREATE FUNCTION public.sloppy_self_promote() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, org_id, role)
  SELECT auth.uid(), org_id, 'ADMIN' FROM public.profiles WHERE user_id = auth.uid()
  ON CONFLICT (user_id, org_id) DO UPDATE SET role = 'ADMIN';
END $$;
GRANT EXECUTE ON FUNCTION public.sloppy_self_promote() TO authenticated;

---------------------------------------------------------------- anon
BEGIN;
SET LOCAL ROLE anon;
SELECT pg_temp.expect('anon has_role(admin) is false',
  NOT public.has_role('11111111-1111-1111-1111-111111111111', 'ADMIN'));
SELECT pg_temp.expect('anon get_user_org_id is null',
  public.get_user_org_id('11111111-1111-1111-1111-111111111111') IS NULL);
SELECT pg_temp.expect('anon cannot read user_roles',
  pg_temp.fails_with('SELECT * FROM public.user_roles', '42501'));
ROLLBACK;

---------------------------------------------------------------- pending user (newbie)
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT pg_temp.expect('user cannot self-approve (column privilege)',
  pg_temp.fails_with($q$UPDATE public.profiles SET pending_approval = false WHERE user_id = auth.uid()$q$, '42501'));
SELECT pg_temp.expect('user cannot hop org (column privilege)',
  pg_temp.fails_with($q$UPDATE public.profiles SET org_id = '00000000-0000-0000-0000-000000000003' WHERE user_id = auth.uid()$q$, '42501'));
SELECT pg_temp.expect('user cannot insert a profile',
  pg_temp.fails_with($q$INSERT INTO public.profiles (user_id, org_id, pending_approval) VALUES (auth.uid(), '00000000-0000-0000-0000-000000000003', false)$q$, '42501'));
UPDATE public.profiles SET full_name = 'Newbie Renamed' WHERE user_id = auth.uid();
SELECT pg_temp.expect('user can update own full_name',
  (SELECT full_name FROM public.profiles WHERE user_id = auth.uid()) = 'Newbie Renamed');
SELECT pg_temp.expect('pending user does not belong to Temporário for data access',
  NOT public.user_belongs_to_org(auth.uid(), '00000000-0000-0000-0000-000000000002'));
SELECT pg_temp.expect('onboarding refuses ADMIN',
  pg_temp.fails_with($q$SELECT public.complete_user_onboarding(auth.uid(), 'ERP', 'ADMIN')$q$, 'P0001'));
SELECT pg_temp.expect('onboarding refuses ANALYST',
  pg_temp.fails_with($q$SELECT public.complete_user_onboarding(auth.uid(), 'ERP', 'ANALYST')$q$, 'P0001'));
SELECT pg_temp.expect('onboarding refuses PROFESSOR on ERP',
  pg_temp.fails_with($q$SELECT public.complete_user_onboarding(auth.uid(), 'ERP', 'PROFESSOR')$q$, 'P0001'));
SELECT pg_temp.expect('onboarding refuses other user id',
  pg_temp.fails_with($q$SELECT public.complete_user_onboarding('33333333-3333-3333-3333-333333333333', 'ERP', 'VIEWER')$q$, '42501'));
SELECT pg_temp.expect('onboarding VIEWER/ERP succeeds',
  public.complete_user_onboarding(auth.uid(), 'ERP', 'VIEWER'));
SELECT pg_temp.expect('onboarding wrote VIEWER role + system_access',
  (SELECT role = 'VIEWER' FROM public.user_roles WHERE user_id = auth.uid())
  AND (SELECT system_access = 'ERP' AND pending_approval FROM public.profiles WHERE user_id = auth.uid()));
SELECT pg_temp.expect('user can read own role row even while pending',
  (SELECT count(*) FROM public.user_roles WHERE user_id = auth.uid()) = 1);
SELECT pg_temp.expect('resubmission is refused',
  pg_temp.fails_with($q$SELECT public.complete_user_onboarding(auth.uid(), 'EDU', 'ESTUDANTE')$q$, 'P0001'));
SELECT pg_temp.expect('sloppy definer cannot grant ADMIN to a non-admin caller',
  pg_temp.fails_with($q$SELECT public.sloppy_self_promote()$q$, '42501'));
SELECT pg_temp.expect('direct insert into user_roles is denied by RLS',
  pg_temp.fails_with($q$INSERT INTO public.user_roles (user_id, org_id, role) VALUES (auth.uid(), '00000000-0000-0000-0000-000000000002', 'ADMIN')$q$, '42501'));
SELECT pg_temp.expect('non-admin approval wrapper returns false',
  NOT public.admin_approve_user('22222222-2222-2222-2222-222222222222'));
SELECT pg_temp.expect('non-admin approval RPC raises',
  pg_temp.fails_with($q$SELECT public.admin_approve_access_request('22222222-2222-2222-2222-222222222222', 'VIEWER', NULL)$q$, '42501'));
COMMIT;

---------------------------------------------------------------- member of Acme (approved viewer)
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT pg_temp.expect('member belongs to own org', public.user_belongs_to_org(auth.uid(), '00000000-0000-0000-0000-000000000003'));
SELECT pg_temp.expect('member cannot see pending user profile',
  (SELECT count(*) FROM public.profiles WHERE user_id = '22222222-2222-2222-2222-222222222222') = 0);
SELECT pg_temp.expect('member cannot write user_roles',
  pg_temp.fails_with($q$UPDATE public.user_roles SET role = 'ADMIN' WHERE user_id = auth.uid()$q$, '42501')
  OR (SELECT role FROM public.user_roles WHERE user_id = '33333333-3333-3333-3333-333333333333') = 'VIEWER');
COMMIT;

---------------------------------------------------------------- platform admin
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT pg_temp.expect('is_sistur_admin via is_platform flag', public.is_sistur_admin(auth.uid()));
SELECT pg_temp.expect('approval cannot grant ADMIN',
  pg_temp.fails_with($q$SELECT public.admin_approve_access_request('22222222-2222-2222-2222-222222222222', 'ADMIN', NULL)$q$, 'P0001'));
SELECT pg_temp.expect('admin approves pending user into Autônomo',
  public.admin_approve_access_request('22222222-2222-2222-2222-222222222222', NULL, NULL));
SELECT pg_temp.expect('approved user moved to Autônomo, not pending, role kept VIEWER',
  (SELECT o.name = 'Autônomo' AND NOT p.pending_approval
     FROM public.profiles p JOIN public.orgs o ON o.id = p.org_id
    WHERE p.user_id = '22222222-2222-2222-2222-222222222222')
  AND (SELECT count(*) = 1 AND bool_and(ur.role = 'VIEWER' AND ur.org_id = (SELECT id FROM public.orgs WHERE name = 'Autônomo'))
         FROM public.user_roles ur WHERE ur.user_id = '22222222-2222-2222-2222-222222222222'));
SELECT pg_temp.expect('license followed the user to the new org',
  (SELECT org_id = (SELECT id FROM public.orgs WHERE name = 'Autônomo') FROM public.licenses WHERE user_id = '22222222-2222-2222-2222-222222222222'));
SELECT pg_temp.expect('audit event written',
  EXISTS (SELECT 1 FROM public.audit_events WHERE event_type = 'USER_ACCESS_APPROVED' AND entity_id = '22222222-2222-2222-2222-222222222222'));
SELECT pg_temp.expect('admin approves member into a specific org with ORG_ADMIN role',
  public.admin_approve_access_request('33333333-3333-3333-3333-333333333333', 'ORG_ADMIN', '00000000-0000-0000-0000-000000000003'));
SELECT pg_temp.expect('member is now ORG_ADMIN of Acme',
  public.has_role_in_org('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'ORG_ADMIN'));
UPDATE public.user_roles SET role = 'ANALYST' WHERE user_id = '33333333-3333-3333-3333-333333333333';
SELECT pg_temp.expect('admin can write user_roles directly (any org)',
  (SELECT role = 'ANALYST' FROM public.user_roles WHERE user_id = '33333333-3333-3333-3333-333333333333'));
ROLLBACK;

---------------------------------------------------------------- service role (edge functions)
BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT pg_temp.expect('service role sees roles via has_role', public.has_role('11111111-1111-1111-1111-111111111111', 'ADMIN'));
INSERT INTO public.user_roles (user_id, org_id, role) VALUES ('33333333-3333-3333-3333-333333333333', '5d08593f-6f82-4737-857b-070f0fc1fe90', 'ORG_ADMIN');
SELECT pg_temp.expect('service role may grant ORG_ADMIN (trigger bypass without JWT subject)', true);
ROLLBACK;

---------------------------------------------------------------- blocked user
BEGIN;
UPDATE public.profiles SET blocked_at = now() WHERE user_id = '33333333-3333-3333-3333-333333333333';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT pg_temp.expect('blocked user loses org membership', NOT public.user_belongs_to_org(auth.uid(), '00000000-0000-0000-0000-000000000003'));
SELECT pg_temp.expect('blocked user has no system access', NOT public.has_system_access(auth.uid(), 'ERP'));
ROLLBACK;

-- Idempotency: applying the migration twice must succeed
\i ../../migrations/20260904000000_rbac_hardening.sql
SELECT pg_temp.expect('migration is idempotent', true);
