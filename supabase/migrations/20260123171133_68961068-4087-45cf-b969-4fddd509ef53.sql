-- Provide org access flags for the currently effective org (supports demo mode)
CREATE OR REPLACE FUNCTION public.get_dashboard_org_access_flags()
RETURNS TABLE(
  org_id uuid,
  has_enterprise_access boolean,
  has_territorial_access boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id as org_id,
    COALESCE(o.has_enterprise_access, false) as has_enterprise_access,
    COALESCE(o.has_territorial_access, false) as has_territorial_access
  FROM public.orgs o
  WHERE o.id = public.get_effective_org_id();
$$;

-- Allow logged-in users to call it
GRANT EXECUTE ON FUNCTION public.get_dashboard_org_access_flags() TO authenticated;