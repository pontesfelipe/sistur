
-- 1. quiz_options: revoke column-level SELECT on is_correct from anon/authenticated
REVOKE SELECT (is_correct) ON public.quiz_options FROM anon, authenticated, PUBLIC;

-- 2. beni_settings: restrict SELECT to ADMIN role only
DROP POLICY IF EXISTS "Authenticated can read beni settings" ON public.beni_settings;
CREATE POLICY "Admins can read beni settings"
ON public.beni_settings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));
