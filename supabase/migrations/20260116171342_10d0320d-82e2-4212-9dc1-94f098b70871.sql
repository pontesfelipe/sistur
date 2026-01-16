-- Enable realtime for action_plans table
ALTER TABLE public.action_plans REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_plans;

-- Enable realtime for projects table
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Enable realtime for project_tasks table
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;