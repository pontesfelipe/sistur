DROP POLICY IF EXISTS "Service role can insert audit" ON public.assessment_indicator_audit;
CREATE POLICY "Only service role can insert audit"
  ON public.assessment_indicator_audit
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');