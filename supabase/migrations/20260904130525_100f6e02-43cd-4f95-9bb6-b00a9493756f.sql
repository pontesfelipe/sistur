-- 1) quiz answer key: hide is_correct from client reads
REVOKE SELECT (is_correct) ON public.quiz_options FROM authenticated;
REVOKE SELECT (is_correct) ON public.quiz_options FROM anon;

-- 2) internal_cron_secrets: explicit service_role access path
DROP POLICY IF EXISTS "service_role full access" ON public.internal_cron_secrets;
CREATE POLICY "service_role full access"
ON public.internal_cron_secrets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
GRANT ALL ON public.internal_cron_secrets TO service_role;
REVOKE ALL ON public.internal_cron_secrets FROM authenticated, anon;

-- 3) standardize org membership checks (profiles subquery -> user_belongs_to_org)
DROP POLICY IF EXISTS "Users can view assessments based on visibility" ON public.assessments;

DROP POLICY IF EXISTS "Org members can view PMS connections" ON public.enterprise_pms_connections;
CREATE POLICY "Org members can view PMS connections"
ON public.enterprise_pms_connections
FOR SELECT
TO authenticated
USING (user_belongs_to_org(auth.uid(), org_id) OR has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Org admins can insert PMS connections" ON public.enterprise_pms_connections;
CREATE POLICY "Org admins can insert PMS connections"
ON public.enterprise_pms_connections
FOR INSERT
TO authenticated
WITH CHECK (
  (user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)))
  OR has_role(auth.uid(), 'ADMIN'::app_role)
);

DROP POLICY IF EXISTS "Org admins can update PMS connections" ON public.enterprise_pms_connections;
CREATE POLICY "Org admins can update PMS connections"
ON public.enterprise_pms_connections
FOR UPDATE
TO authenticated
USING (
  (user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)))
  OR has_role(auth.uid(), 'ADMIN'::app_role)
)
WITH CHECK (
  (user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)))
  OR has_role(auth.uid(), 'ADMIN'::app_role)
);

DROP POLICY IF EXISTS "Org admins can delete PMS connections" ON public.enterprise_pms_connections;
CREATE POLICY "Org admins can delete PMS connections"
ON public.enterprise_pms_connections
FOR DELETE
TO authenticated
USING (
  (user_belongs_to_org(auth.uid(), org_id)
    AND (has_role(auth.uid(), 'ORG_ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role)))
  OR has_role(auth.uid(), 'ADMIN'::app_role)
);