-- 1) Scope assessment_units SELECT to the user's org (or demo org) / ADMIN
DROP POLICY IF EXISTS "Members can view units of accessible assessments" ON public.assessment_units;
CREATE POLICY "Members can view units of their org assessments"
ON public.assessment_units
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_units.assessment_id
      AND (
        a.org_id IN (
          SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid()
          UNION
          SELECT p.viewing_demo_org_id FROM public.profiles p
           WHERE p.user_id = auth.uid() AND p.viewing_demo_org_id IS NOT NULL
        )
        OR public.has_role(auth.uid(), 'ADMIN'::app_role)
      )
  )
);

-- 2) Restrict certificates policies to authenticated role (was public role)
DROP POLICY IF EXISTS "Admins can manage all certificates" ON public.certificates;
CREATE POLICY "Admins can manage all certificates"
ON public.certificates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
CREATE POLICY "Users can view their own certificates"
ON public.certificates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);