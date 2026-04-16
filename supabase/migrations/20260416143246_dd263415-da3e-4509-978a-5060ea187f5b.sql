-- 1. Remove anon ALL policy on test_flow_registry
DROP POLICY IF EXISTS "Service insert test registry" ON public.test_flow_registry;

-- 2. Remove anon INSERT/UPDATE on system_health_checks
DROP POLICY IF EXISTS "Service can insert health checks" ON public.system_health_checks;
DROP POLICY IF EXISTS "Service can update health checks" ON public.system_health_checks;
DROP POLICY IF EXISTS "Service role or admin can insert health checks" ON public.system_health_checks;
DROP POLICY IF EXISTS "Service role or admin can update health checks" ON public.system_health_checks;
CREATE POLICY "Service role can insert health checks"
  ON public.system_health_checks FOR INSERT TO public
  WITH CHECK (
    is_sistur_admin(auth.uid())
    OR current_setting('role', true) = 'service_role'
  );
CREATE POLICY "Service role can update health checks"
  ON public.system_health_checks FOR UPDATE TO public
  USING (
    is_sistur_admin(auth.uid())
    OR current_setting('role', true) = 'service_role'
  );

-- 3. Remove anon INSERT on test_registry_sync_log
DROP POLICY IF EXISTS "Service insert sync log" ON public.test_registry_sync_log;

-- 4. Remove broad org-admin SELECT on investor_profiles base table
DROP POLICY IF EXISTS "Org admins can view org investor profiles (no PII)" ON public.investor_profiles;

-- 5. Remove broad public SELECT on lms_certificates (RPC handles verification)
DROP POLICY IF EXISTS "Anyone can verify active certificates" ON public.lms_certificates;