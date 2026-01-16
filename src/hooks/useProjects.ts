import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type ProjectMethodology = 'waterfall' | 'safe' | 'scrum' | 'kanban';
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskType = 'epic' | 'feature' | 'story' | 'task' | 'bug' | 'milestone';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  org_id: string;
  destination_id: string;
  assessment_id: string;
  report_id: string | null;
  name: string;
  description: string | null;
  methodology: ProjectMethodology;
  status: ProjectStatus;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  owner_id: string | null;
  priority: TaskPriority;
  budget_estimated: number | null;
  budget_actual: number | null;
  generated_structure: unknown | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  destination?: { name: string; uf: string | null };
  assessment?: { title: string; status: string };
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  phase_order: number;
  phase_type: string;
  status: PhaseStatus;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  deliverables: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  phase_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  assignee_name: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  story_points: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  linked_issue_id: string | null;
  linked_prescription_id: string | null;
  linked_action_plan_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string;
  completed_date: string | null;
  status: 'pending' | 'completed' | 'missed';
  created_at: string;
}

// Hook to get all projects
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          destination:destinations(name, uf),
          assessment:assessments(title, status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });
}

// Hook to get a single project with all details
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          destination:destinations(name, uf),
          assessment:assessments(title, status)
        `)
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

// Hook to get project phases
export function useProjectPhases(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-phases", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order", { ascending: true });

      if (error) throw error;
      return data as ProjectPhase[];
    },
    enabled: !!projectId,
  });
}

// Hook to get project tasks
export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ProjectTask[];
    },
    enabled: !!projectId,
  });
}

// Hook to get project milestones
export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("target_date", { ascending: true });

      if (error) throw error;
      return data as ProjectMilestone[];
    },
    enabled: !!projectId,
  });
}

// Hook to check if a destination has required data for project creation
export function useDestinationsWithReportData() {
  return useQuery({
    queryKey: ["destinations-with-report-data"],
    queryFn: async () => {
      // Get all reports accessible to the user
      const { data: reports, error: reportsError } = await supabase
        .from("generated_reports")
        .select("id, assessment_id, destination_name");

      if (reportsError) throw reportsError;

      const assessmentIds = reports?.map((r) => r.assessment_id).filter(Boolean) || [];
      
      if (assessmentIds.length === 0) return [];

      // Get assessments that are CALCULATED and have reports
      const { data: assessments, error: assessmentsError } = await supabase
        .from("assessments")
        .select(`
          id,
          title,
          destination_id,
          status,
          destination:destinations(id, name, uf)
        `)
        .in("id", assessmentIds)
        .eq("status", "CALCULATED");

      if (assessmentsError) throw assessmentsError;

      return assessments?.map((a) => ({
        assessment_id: a.id,
        assessment_title: a.title,
        destination_id: a.destination_id,
        destination_name: (a.destination as any)?.name || '',
        destination_uf: (a.destination as any)?.uf || '',
        has_report: true,
      })) || [];
    },
  });
}

// Hook to create a project
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (project: {
      org_id: string;
      destination_id: string;
      assessment_id: string;
      report_id?: string;
      name: string;
      description?: string;
      methodology: ProjectMethodology;
      planned_start_date?: string;
      planned_end_date?: string;
      priority?: TaskPriority;
      generated_structure?: unknown;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          org_id: project.org_id,
          destination_id: project.destination_id,
          assessment_id: project.assessment_id,
          report_id: project.report_id,
          name: project.name,
          description: project.description,
          methodology: project.methodology,
          planned_start_date: project.planned_start_date,
          planned_end_date: project.planned_end_date,
          priority: project.priority,
          generated_structure: project.generated_structure as any,
          created_by: user?.id || '',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Projeto criado",
        description: "O projeto foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to update a project
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
      toast({
        title: "Projeto atualizado",
        description: "As alterações foram salvas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Projeto excluído",
        description: "O projeto foi removido",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to create phases
export function useCreatePhases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phases: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from("project_phases")
        .insert(phases)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.[0]) {
        queryClient.invalidateQueries({ queryKey: ["project-phases", data[0].project_id] });
      }
    },
  });
}

// Hook to update a phase
export function useUpdatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ProjectPhase, 'id' | 'project_id' | 'created_at'>>;
    }) => {
      const { data, error } = await supabase
        .from("project_phases")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", data.project_id] });
    },
  });
}

// Hook to create tasks
export function useCreateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: Omit<ProjectTask, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .insert(tasks)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.[0]) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", data[0].project_id] });
      }
    },
  });
}

// Hook to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ProjectTask, 'id' | 'project_id' | 'created_at'>>;
    }) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", data.project_id] });
    },
  });
}

// Hook to delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
  });
}

// Hook to create milestones
export function useCreateMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestones: Omit<ProjectMilestone, 'id' | 'created_at'>[]) => {
      const { data, error } = await supabase
        .from("project_milestones")
        .insert(milestones)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.[0]) {
        queryClient.invalidateQueries({ queryKey: ["project-milestones", data[0].project_id] });
      }
    },
  });
}

// Hook to create a single phase
export function useCreatePhase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phase: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("project_phases")
        .insert(phase)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", data.project_id] });
      toast({
        title: "Fase criada",
        description: "A fase foi adicionada ao projeto",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar fase",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to delete a phase
export function useDeletePhase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_phases").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      toast({
        title: "Fase excluída",
        description: "A fase e suas tarefas foram removidas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir fase",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to create a single task
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (task: Omit<ProjectTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", data.project_id] });
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi adicionada ao projeto",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to create a single milestone
export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (milestone: Omit<ProjectMilestone, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("project_milestones")
        .insert(milestone)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", data.project_id] });
      toast({
        title: "Marco criado",
        description: "O marco foi adicionado ao projeto",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar marco",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to update a milestone
export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ProjectMilestone, 'id' | 'project_id' | 'created_at'>>;
    }) => {
      const { data, error } = await supabase
        .from("project_milestones")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", data.project_id] });
      toast({
        title: "Marco atualizado",
        description: "As alterações foram salvas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar marco",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to delete a milestone
export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_milestones").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast({
        title: "Marco excluído",
        description: "O marco foi removido do projeto",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir marco",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Methodology info
export const METHODOLOGY_INFO: Record<ProjectMethodology, {
  name: string;
  description: string;
  phases: { name: string; description: string }[];
}> = {
  waterfall: {
    name: 'Waterfall',
    description: 'Metodologia sequencial tradicional com fases bem definidas',
    phases: [
      { name: 'Iniciação', description: 'Definição de escopo, objetivos e stakeholders' },
      { name: 'Planejamento', description: 'Cronograma detalhado, recursos e orçamento' },
      { name: 'Execução', description: 'Implementação das atividades planejadas' },
      { name: 'Monitoramento', description: 'Acompanhamento de progresso e indicadores' },
      { name: 'Encerramento', description: 'Entrega final e lições aprendidas' },
    ],
  },
  safe: {
    name: 'SAFe (Scaled Agile Framework)',
    description: 'Framework ágil escalado para organizações complexas',
    phases: [
      { name: 'PI Planning', description: 'Planejamento do Program Increment' },
      { name: 'Sprint 1', description: 'Primeira iteração de desenvolvimento' },
      { name: 'Sprint 2', description: 'Segunda iteração de desenvolvimento' },
      { name: 'Sprint 3', description: 'Terceira iteração de desenvolvimento' },
      { name: 'Sprint 4', description: 'Quarta iteração de desenvolvimento' },
      { name: 'Innovation & Planning', description: 'Retrospectiva e planejamento do próximo PI' },
    ],
  },
  scrum: {
    name: 'Scrum',
    description: 'Framework ágil iterativo com sprints curtas',
    phases: [
      { name: 'Product Backlog', description: 'Lista priorizada de funcionalidades' },
      { name: 'Sprint Planning', description: 'Planejamento da sprint' },
      { name: 'Sprint Execution', description: 'Execução das tarefas da sprint' },
      { name: 'Sprint Review', description: 'Demonstração do incremento' },
      { name: 'Sprint Retrospective', description: 'Retrospectiva e melhoria contínua' },
    ],
  },
  kanban: {
    name: 'Kanban',
    description: 'Sistema visual de fluxo contínuo de trabalho',
    phases: [
      { name: 'Backlog', description: 'Itens aguardando priorização' },
      { name: 'A Fazer', description: 'Próximos itens a serem trabalhados' },
      { name: 'Em Progresso', description: 'Itens sendo desenvolvidos' },
      { name: 'Em Revisão', description: 'Itens em validação/teste' },
      { name: 'Concluído', description: 'Itens finalizados' },
    ],
  },
};

export const PROJECT_STATUS_INFO: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: 'Planejamento', color: 'bg-blue-500' },
  in_progress: { label: 'Em Andamento', color: 'bg-amber-500' },
  on_hold: { label: 'Pausado', color: 'bg-gray-500' },
  completed: { label: 'Concluído', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
};

export const TASK_STATUS_INFO: Record<TaskStatus, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'bg-slate-400' },
  todo: { label: 'A Fazer', color: 'bg-blue-400' },
  in_progress: { label: 'Em Progresso', color: 'bg-amber-400' },
  review: { label: 'Em Revisão', color: 'bg-purple-400' },
  done: { label: 'Concluído', color: 'bg-green-400' },
  blocked: { label: 'Bloqueado', color: 'bg-red-400' },
};

export const PRIORITY_INFO: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-slate-400' },
  medium: { label: 'Média', color: 'bg-blue-400' },
  high: { label: 'Alta', color: 'bg-amber-400' },
  critical: { label: 'Crítica', color: 'bg-red-500' },
};
