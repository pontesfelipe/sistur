-- Create project management tables

-- Main projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  destination_id UUID NOT NULL REFERENCES public.destinations(id),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id),
  report_id UUID REFERENCES public.generated_reports(id),
  
  -- Project info
  name TEXT NOT NULL,
  description TEXT,
  methodology TEXT NOT NULL CHECK (methodology IN ('waterfall', 'safe', 'scrum', 'kanban')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  
  -- Dates
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- Metadata
  owner_id UUID,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  budget_estimated DECIMAL(15,2),
  budget_actual DECIMAL(15,2),
  
  -- AI Generated content
  generated_structure JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Project phases/stages table (for Waterfall or SAFe PIs)
CREATE TABLE public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  phase_order INTEGER NOT NULL,
  phase_type TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  deliverables JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project tasks table
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'task' CHECK (task_type IN ('epic', 'feature', 'story', 'task', 'bug', 'milestone')),
  
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  assignee_id UUID,
  assignee_name TEXT,
  
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2),
  story_points INTEGER,
  
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  linked_issue_id UUID REFERENCES public.issues(id),
  linked_prescription_id UUID REFERENCES public.prescriptions(id),
  linked_action_plan_id UUID REFERENCES public.action_plans(id),
  
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project milestones
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their org"
  ON public.projects FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create projects in their org"
  ON public.projects FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update projects in their org"
  ON public.projects FOR UPDATE
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete projects in their org"
  ON public.projects FOR DELETE
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for project_phases
CREATE POLICY "Users can view phases of projects in their org"
  ON public.project_phases FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage phases of projects in their org"
  ON public.project_phases FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

-- RLS Policies for project_tasks
CREATE POLICY "Users can view tasks of projects in their org"
  ON public.project_tasks FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage tasks of projects in their org"
  ON public.project_tasks FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

-- RLS Policies for project_milestones
CREATE POLICY "Users can view milestones of projects in their org"
  ON public.project_milestones FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage milestones of projects in their org"
  ON public.project_milestones FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE org_id IN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())));

-- Create update triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();