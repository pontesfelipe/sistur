-- Drop the problematic ALL policy that lacks WITH CHECK
DROP POLICY IF EXISTS "Admins/Analysts can manage destinations" ON public.destinations;

-- Recreate as separate SELECT and INSERT/UPDATE/DELETE policies with proper clauses
CREATE POLICY "Admins/Analysts can select destinations"
ON public.destinations FOR SELECT TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

CREATE POLICY "Admins/Analysts can insert destinations"
ON public.destinations FOR INSERT TO authenticated
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

CREATE POLICY "Admins/Analysts can update destinations"
ON public.destinations FOR UPDATE TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

CREATE POLICY "Admins/Analysts can delete destinations"
ON public.destinations FOR DELETE TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

-- Also fix the general INSERT policy to support effective org (demo mode)
DROP POLICY IF EXISTS "Users can insert destinations in their org" ON public.destinations;

CREATE POLICY "Users can insert destinations in their org"
ON public.destinations FOR INSERT TO authenticated
WITH CHECK (
  org_id = get_effective_org_id()
);