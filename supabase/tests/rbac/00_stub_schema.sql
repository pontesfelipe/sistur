-- Minimal Supabase-like stub to smoke-test the RBAC hardening migration.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

CREATE TYPE public.app_role AS ENUM ('ADMIN','ANALYST','VIEWER','ESTUDANTE','PROFESSOR','ORG_ADMIN');
CREATE TYPE public.system_access_type AS ENUM ('ERP','EDU');

CREATE TABLE public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  full_name text, avatar_url text,
  system_access public.system_access_type,
  pending_approval boolean DEFAULT false,
  approval_requested_at timestamptz,
  viewing_demo_org_id uuid,
  forum_show_identity boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  role public.app_role NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, org_id uuid, plan text, status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL, user_id uuid, event_type text NOT NULL,
  entity_type text, entity_id uuid, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Pre-existing helpers (initial migration versions)
CREATE FUNCTION public.get_user_org_id(_user_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND org_id = _org_id) $$;
CREATE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND org_id = _org_id) $$;
CREATE FUNCTION public.has_org_admin_role(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'ORG_ADMIN') $$;
CREATE FUNCTION public.has_system_access(_user_id uuid, _access public.system_access_type) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND (system_access = _access OR system_access IS NULL) AND pending_approval = false) $$;
CREATE FUNCTION public.is_sistur_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.user_id WHERE p.user_id = _user_id AND ur.role = 'ADMIN' AND p.org_id = '5d08593f-6f82-4737-857b-070f0fc1fe90') $$;
CREATE FUNCTION public.admin_get_all_users() RETURNS TABLE (user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.profiles WHERE public.has_role(auth.uid(), 'ADMIN') $$;
CREATE FUNCTION public.complete_user_onboarding(_user_id uuid, _system_access text, _role text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE FUNCTION public.admin_approve_user(_user_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;

-- Pre-existing policies that the migration replaces
CREATE POLICY "Users can view profiles in their org" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Users can update own profile safe fields" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users can view roles in their org" ON public.user_roles FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Admins can manage roles in their org" ON public.user_roles FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users can view their own org or admins all" ON public.orgs FOR SELECT
  USING (auth.uid() IS NOT NULL AND (user_belongs_to_org(auth.uid(), id) OR has_role(auth.uid(), 'ADMIN')));

-- Seed
INSERT INTO public.orgs (id, name) VALUES
  ('5d08593f-6f82-4737-857b-070f0fc1fe90', 'SISTUR'),
  ('00000000-0000-0000-0000-000000000002', 'Temporário'),
  ('00000000-0000-0000-0000-000000000003', 'Acme Ltda');
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@sistur'),
  ('22222222-2222-2222-2222-222222222222', 'newbie@x'),
  ('33333333-3333-3333-3333-333333333333', 'member@acme');
INSERT INTO public.profiles (user_id, org_id, full_name, pending_approval) VALUES
  ('11111111-1111-1111-1111-111111111111', '5d08593f-6f82-4737-857b-070f0fc1fe90', 'Admin', false),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'Newbie', true),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'Member', false);
INSERT INTO public.user_roles (user_id, org_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '5d08593f-6f82-4737-857b-070f0fc1fe90', 'ADMIN'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'VIEWER');
INSERT INTO public.licenses (user_id, org_id, plan, status) VALUES
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'trial', 'active');
CREATE POLICY "Admins can read all licenses" ON public.licenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can view audit events" ON public.audit_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
