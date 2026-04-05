
-- Helper: check if user is admin AND belongs to SISTUR org
CREATE OR REPLACE FUNCTION public.is_sistur_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = _user_id
      AND ur.role = 'ADMIN'
      AND p.org_id = '5d08593f-6f82-4737-857b-070f0fc1fe90'
  )
$$;

-- Replace org policies to use is_sistur_admin
DROP POLICY IF EXISTS "Admins can update any org" ON public.orgs;
CREATE POLICY "SISTUR admins can update any org" ON public.orgs
  FOR UPDATE TO authenticated
  USING (public.is_sistur_admin(auth.uid()))
  WITH CHECK (public.is_sistur_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete orgs" ON public.orgs;
CREATE POLICY "SISTUR admins can delete orgs" ON public.orgs
  FOR DELETE TO authenticated
  USING (public.is_sistur_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert orgs" ON public.orgs;
CREATE POLICY "SISTUR admins can insert orgs" ON public.orgs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_sistur_admin(auth.uid()));

-- Also update SELECT to let SISTUR admins see all orgs
DROP POLICY IF EXISTS "Users can view their own org or admins all" ON public.orgs;
CREATE POLICY "Users can view own org or SISTUR admins all" ON public.orgs
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_org(auth.uid(), id)
    OR public.is_sistur_admin(auth.uid())
  );
