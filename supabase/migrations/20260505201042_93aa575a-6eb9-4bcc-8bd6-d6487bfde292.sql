
DROP POLICY IF EXISTS "Admins/Analysts can manage external indicator values" ON public.external_indicator_values;

CREATE POLICY "Admins/Analysts can manage external indicator values"
ON public.external_indicator_values
FOR ALL TO authenticated
USING (
  (user_belongs_to_org(auth.uid(), org_id) OR org_id = get_effective_org_id())
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
)
WITH CHECK (
  (user_belongs_to_org(auth.uid(), org_id) OR org_id = get_effective_org_id())
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);
