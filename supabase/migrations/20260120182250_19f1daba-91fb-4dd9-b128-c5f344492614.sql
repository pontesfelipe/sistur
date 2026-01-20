-- Update projects RLS policy to use get_effective_org_id() for demo mode support
DROP POLICY IF EXISTS "Users can view projects in their org" ON public.projects;
CREATE POLICY "Users can view projects in their org or demo" ON public.projects
  FOR SELECT USING (org_id = public.get_effective_org_id());

-- Update project_tasks RLS policy to use get_effective_org_id() for demo mode support
DROP POLICY IF EXISTS "Users can view tasks of projects in their org" ON public.project_tasks;
CREATE POLICY "Users can view tasks of projects in their org or demo" ON public.project_tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE org_id = public.get_effective_org_id()
    )
  );