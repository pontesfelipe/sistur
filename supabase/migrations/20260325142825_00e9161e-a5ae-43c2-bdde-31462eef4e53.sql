
DROP POLICY "Users can view their own org" ON public.orgs;

CREATE POLICY "Users can view their own org or admins all"
ON public.orgs FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_belongs_to_org(auth.uid(), id) 
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
);
