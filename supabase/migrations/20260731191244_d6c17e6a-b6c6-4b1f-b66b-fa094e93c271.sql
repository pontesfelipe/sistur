-- assessments: add visibility check to the broad org/demo policy
DROP POLICY IF EXISTS "Users can view assessments in their org or demo" ON public.assessments;
CREATE POLICY "Users can view assessments in their org or demo"
ON public.assessments FOR SELECT TO authenticated
USING (
  org_id = get_effective_org_id()
  AND (
    visibility IS DISTINCT FROM 'personal'
    OR creator_user_id = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
);

-- assessments: ADMIN/ANALYST manage policy must not bypass personal visibility on reads
DROP POLICY IF EXISTS "Admins/Analysts can manage assessments" ON public.assessments;
CREATE POLICY "Admins/Analysts can manage assessments"
ON public.assessments FOR ALL TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
  AND (
    visibility IS DISTINCT FROM 'personal'
    OR creator_user_id = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
)
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
);

-- destinations: add visibility check to the broad org/demo policy
DROP POLICY IF EXISTS "Users can view destinations in their org or demo" ON public.destinations;
CREATE POLICY "Users can view destinations in their org or demo"
ON public.destinations FOR SELECT TO authenticated
USING (
  org_id = get_effective_org_id()
  AND (
    visibility IS DISTINCT FROM 'personal'
    OR creator_user_id = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
);

-- destinations: ADMIN/ANALYST select policy must not bypass personal visibility
DROP POLICY IF EXISTS "Admins/Analysts can select destinations" ON public.destinations;
CREATE POLICY "Admins/Analysts can select destinations"
ON public.destinations FOR SELECT TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'ANALYST'::app_role))
  AND (
    visibility IS DISTINCT FROM 'personal'
    OR creator_user_id = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
);

-- generated_reports: enforce visibility on both SELECT policies
DROP POLICY IF EXISTS "Users can view reports in their org" ON public.generated_reports;
CREATE POLICY "Users can view reports in their org"
ON public.generated_reports FOR SELECT TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (
    visibility IS DISTINCT FROM 'personal'
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
);

DROP POLICY IF EXISTS "Users can view reports in their org or demo" ON public.generated_reports;
CREATE POLICY "Users can view reports in their org or demo"
ON public.generated_reports FOR SELECT TO authenticated
USING (
  org_id = get_effective_org_id()
  AND (
    visibility IS DISTINCT FROM 'personal'
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'ADMIN'::app_role)
  )
);