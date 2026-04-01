-- Fix assessments UPDATE policy to support demo mode
DROP POLICY IF EXISTS "Users can update their own or org assessments" ON public.assessments;

CREATE POLICY "Users can update assessments in effective org"
ON public.assessments
FOR UPDATE
TO authenticated
USING (org_id = get_effective_org_id())
WITH CHECK (org_id = get_effective_org_id());

-- Fix destinations UPDATE policies to also support demo mode
DROP POLICY IF EXISTS "Users can update their own or org destinations" ON public.destinations;
DROP POLICY IF EXISTS "Admins/Analysts can update destinations" ON public.destinations;

CREATE POLICY "Admins/Analysts can update destinations"
ON public.destinations
FOR UPDATE
TO authenticated
USING (
  org_id = get_effective_org_id()
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
)
WITH CHECK (
  org_id = get_effective_org_id()
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);