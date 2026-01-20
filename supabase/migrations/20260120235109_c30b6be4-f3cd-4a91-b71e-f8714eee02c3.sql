-- Update project_phases policies for demo mode
DROP POLICY IF EXISTS "Users can manage phases of projects in their org" ON public.project_phases;
DROP POLICY IF EXISTS "Users can view phases of projects in their org" ON public.project_phases;

CREATE POLICY "Users can view phases of projects in their org"
ON public.project_phases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_phases.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can insert phases of projects in their org"
ON public.project_phases FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_phases.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can update phases of projects in their org"
ON public.project_phases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_phases.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can delete phases of projects in their org"
ON public.project_phases FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_phases.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

-- Update project_tasks policies for demo mode
DROP POLICY IF EXISTS "Users can manage tasks of projects in their org" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can view tasks of projects in their org or demo" ON public.project_tasks;

CREATE POLICY "Users can view tasks of projects in their org"
ON public.project_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can insert tasks of projects in their org"
ON public.project_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can update tasks of projects in their org"
ON public.project_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can delete tasks of projects in their org"
ON public.project_tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

-- Update project_milestones policies for demo mode
DROP POLICY IF EXISTS "Users can manage milestones of projects in their org" ON public.project_milestones;
DROP POLICY IF EXISTS "Users can view milestones of projects in their org" ON public.project_milestones;

CREATE POLICY "Users can view milestones of projects in their org"
ON public.project_milestones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can insert milestones of projects in their org"
ON public.project_milestones FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can update milestones of projects in their org"
ON public.project_milestones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);

CREATE POLICY "Users can delete milestones of projects in their org"
ON public.project_milestones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_milestones.project_id
    AND p.org_id = public.get_effective_org_id()
  )
);