-- Drop existing restrictive policy and create new ones that support demo mode
DROP POLICY IF EXISTS "Admins/Analysts can manage indicator values" ON public.indicator_values;

-- Create INSERT policy with demo mode support
CREATE POLICY "Users can insert indicator values in their effective org"
ON public.indicator_values
FOR INSERT
WITH CHECK (
  org_id = get_effective_org_id()
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

-- Create UPDATE policy with demo mode support
CREATE POLICY "Users can update indicator values in their effective org"
ON public.indicator_values
FOR UPDATE
USING (org_id = get_effective_org_id())
WITH CHECK (
  org_id = get_effective_org_id()
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

-- Create DELETE policy with demo mode support
CREATE POLICY "Users can delete indicator values in their effective org"
ON public.indicator_values
FOR DELETE
USING (
  org_id = get_effective_org_id()
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);