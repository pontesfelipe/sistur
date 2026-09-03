-- 1) territorial_impact_scores: remove anonymous public read
DROP POLICY IF EXISTS "Public can view certified destination scores" ON public.territorial_impact_scores;
CREATE POLICY "Authenticated can view certified destination scores"
ON public.territorial_impact_scores
FOR SELECT
TO authenticated
USING (certification_eligible = true);
REVOKE ALL ON public.territorial_impact_scores FROM anon;

-- 2) org_referral_codes: scope reads to the user's own organization
DROP POLICY IF EXISTS "anyone_can_read_codes" ON public.org_referral_codes;
CREATE POLICY "members_read_own_org_codes"
ON public.org_referral_codes
FOR SELECT
TO authenticated
USING (org_id = public.get_user_org_id(auth.uid()));
REVOKE ALL ON public.org_referral_codes FROM anon;

-- 3) profiles: authenticated-only visibility
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_belongs_to_org(auth.uid(), org_id)
);
DROP POLICY IF EXISTS "Users can update own profile safe fields" ON public.profiles;
CREATE POLICY "Users can update own profile safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.profiles FROM anon;