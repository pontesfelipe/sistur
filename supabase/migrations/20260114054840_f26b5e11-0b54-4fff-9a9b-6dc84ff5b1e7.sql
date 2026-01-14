-- Allow admins to approve/update user profiles within their organization
-- Existing policy only allows users to update their own profile, which blocks approvals.

DO $$
BEGIN
  -- Ensure RLS is enabled (safe if already enabled)
  EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN
  -- ignore
  NULL;
END $$;

DROP POLICY IF EXISTS "Admins can update profiles in their org" ON public.profiles;

CREATE POLICY "Admins can update profiles in their org"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND user_belongs_to_org(auth.uid(), org_id)
  AND has_role(auth.uid(), 'ADMIN'::public.app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_belongs_to_org(auth.uid(), org_id)
  AND has_role(auth.uid(), 'ADMIN'::public.app_role)
);
