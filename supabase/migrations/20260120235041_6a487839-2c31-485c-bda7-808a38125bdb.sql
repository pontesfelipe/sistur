-- Drop existing policies for projects
DROP POLICY IF EXISTS "Users can create projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects in their org or demo" ON public.projects;

-- Recreate policies using get_effective_org_id() for demo mode support

-- SELECT: Users can view projects from their effective org
CREATE POLICY "Users can view projects in their org"
ON public.projects FOR SELECT
USING (org_id = public.get_effective_org_id());

-- INSERT: Users can create projects in their effective org
CREATE POLICY "Users can create projects in their org"
ON public.projects FOR INSERT
WITH CHECK (org_id = public.get_effective_org_id());

-- UPDATE: Users can update projects in their effective org
CREATE POLICY "Users can update projects in their org"
ON public.projects FOR UPDATE
USING (org_id = public.get_effective_org_id());

-- DELETE: Users can delete projects in their effective org
CREATE POLICY "Users can delete projects in their org"
ON public.projects FOR DELETE
USING (org_id = public.get_effective_org_id());