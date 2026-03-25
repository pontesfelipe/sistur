CREATE POLICY "Users can update own terms acceptance"
ON public.terms_acceptance
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());