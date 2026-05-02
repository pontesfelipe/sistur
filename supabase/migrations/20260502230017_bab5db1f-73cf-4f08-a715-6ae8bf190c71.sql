DROP POLICY IF EXISTS "Admins can read all terms acceptance" ON public.terms_acceptance;

CREATE POLICY "Platform admins can read all terms acceptance"
ON public.terms_acceptance
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Org admins can read same-org terms acceptance"
ON public.terms_acceptance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles target
    JOIN public.user_roles ur
      ON ur.user_id = auth.uid()
     AND ur.role = 'ORG_ADMIN'::app_role
     AND ur.org_id = target.org_id
    WHERE target.user_id = terms_acceptance.user_id
  )
);