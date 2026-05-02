-- 1. Add explicit consent flag for sharing identity with opportunity owners
ALTER TABLE public.investment_interests
  ADD COLUMN IF NOT EXISTS share_with_owner boolean NOT NULL DEFAULT false;

-- 2. Replace owner SELECT policy to require consent
DROP POLICY IF EXISTS "Opportunity owners can view interests" ON public.investment_interests;
CREATE POLICY "Opportunity owners can view consented interests"
ON public.investment_interests
FOR SELECT
TO authenticated
USING (
  share_with_owner = true
  AND opportunity_id IN (
    SELECT id FROM public.investment_opportunities
    WHERE org_id IN (
      SELECT org_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

-- 3. Hard-revoke anon access to investor_profiles (defense in depth)
REVOKE ALL ON public.investor_profiles FROM anon;