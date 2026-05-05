
DROP POLICY IF EXISTS "Users can insert indicator values in their effective org" ON public.indicator_values;
DROP POLICY IF EXISTS "Users can update indicator values in their effective org" ON public.indicator_values;
DROP POLICY IF EXISTS "Users can delete indicator values in their effective org" ON public.indicator_values;

CREATE POLICY "Users can insert indicator values in their org"
ON public.indicator_values FOR INSERT TO authenticated
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

CREATE POLICY "Users can update indicator values in their org"
ON public.indicator_values FOR UPDATE TO authenticated
USING (user_belongs_to_org(auth.uid(), org_id))
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

CREATE POLICY "Users can delete indicator values in their org"
ON public.indicator_values FOR DELETE TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);
