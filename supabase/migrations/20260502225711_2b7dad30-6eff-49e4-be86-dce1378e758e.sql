DROP POLICY IF EXISTS "Service role can insert audit" ON public.assessment_indicator_audit;
CREATE POLICY "Service role can insert audit"
ON public.assessment_indicator_audit
FOR INSERT
TO service_role
WITH CHECK (true);