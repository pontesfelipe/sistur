
-- 1. report_jobs: restrict view to creator + org admins (no longer all org members),
--    and revoke direct SELECT on auth_jwt column from authenticated role.
DROP POLICY IF EXISTS "Users can view report jobs in their org" ON public.report_jobs;
CREATE POLICY "Creators and org admins can view report jobs"
  ON public.report_jobs
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role_in_org(auth.uid(), org_id, 'ORG_ADMIN'::app_role)
  );

REVOKE SELECT (auth_jwt) ON public.report_jobs FROM authenticated, anon;

-- 2. mapa_turismo_sync_log: lock down insert to ADMIN or service_role.
DROP POLICY IF EXISTS "Service can insert sync logs" ON public.mapa_turismo_sync_log;
CREATE POLICY "Admins/service role can insert sync logs"
  ON public.mapa_turismo_sync_log
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));

-- 3. forum-attachments: enforce per-user folder on upload + allow owner updates.
DROP POLICY IF EXISTS "Authenticated users can upload forum attachments" ON storage.objects;
CREATE POLICY "Users can upload to their own forum attachments folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own forum attachments"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
