
-- 1) Restringir leitura da coluna auth_jwt em report_jobs (apenas service_role pode ler)
REVOKE SELECT ON public.report_jobs FROM authenticated;
REVOKE SELECT ON public.report_jobs FROM anon;

GRANT SELECT (
  id, org_id, assessment_id, destination_name, report_template, visibility,
  environment, status, stage, progress_pct, error_message, report_id, created_by,
  created_at, started_at, finished_at, payload, attempts, last_attempt_at,
  partial_content, partial_pillars
) ON public.report_jobs TO authenticated;

-- 2) Forum likes: SELECT exige autenticação
DROP POLICY IF EXISTS "Users can view likes" ON public.forum_post_likes;
CREATE POLICY "Authenticated users can view post likes"
  ON public.forum_post_likes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view reply likes" ON public.forum_reply_likes;
CREATE POLICY "Authenticated users can view reply likes"
  ON public.forum_reply_likes
  FOR SELECT
  TO authenticated
  USING (true);
