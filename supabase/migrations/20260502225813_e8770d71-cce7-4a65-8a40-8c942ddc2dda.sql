CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can delete suppressed emails"
ON public.suppressed_emails
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role));