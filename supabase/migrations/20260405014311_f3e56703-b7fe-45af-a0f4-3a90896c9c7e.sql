
-- Drop old restrictive update policy
DROP POLICY IF EXISTS "Admins can update their org" ON public.orgs;

-- Admin can update ANY org
CREATE POLICY "Admins can update any org" ON public.orgs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can delete orgs
DROP POLICY IF EXISTS "Admins can delete orgs" ON public.orgs;
CREATE POLICY "Admins can delete orgs" ON public.orgs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Admin can insert orgs
DROP POLICY IF EXISTS "Admins can insert orgs" ON public.orgs;
CREATE POLICY "Admins can insert orgs" ON public.orgs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
