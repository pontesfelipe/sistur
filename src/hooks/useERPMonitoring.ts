import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';

export interface ERPStats {
  totalPlans: number;
  completedPlans: number;
  inProgressPlans: number;
  pendingPlans: number;
  overdueCount: number;
  completionRate: number;
  avgCompletionDays: number | null;
  // New project stats
  totalProjects: number;
  activeProjects: number;
  projectCompletionRate: number;
}

export interface PillarProgress {
  pillar: 'RA' | 'OE' | 'AO';
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

export interface CycleEvolution {
  cycle: number;
  assessmentId: string;
  title: string;
  date: string;
  plansCreated: number;
  plansCompleted: number;
  completionRate: number;
  avgPillarScore: number;
  evolutionState: 'EVOLUTION' | 'STAGNATION' | 'REGRESSION' | null;
  hasProject: boolean;
  projectStatus?: string;
}

export interface ActionPlanWithDetails {
  id: string;
  title: string;
  status: string;
  priority: number;
  pillar: string | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  owner: string | null;
  assessment: {
    id: string;
    title: string;
    destination: string;
  };
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export interface ProjectStats {
  id: string;
  name: string;
  status: string;
  methodology: string;
  destinationName: string;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  planned_end_date: string | null;
}

// Hook to invalidate all ERP queries - useful for real-time updates
export function useERPQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['erp-stats'] });
    queryClient.invalidateQueries({ queryKey: ['erp-pillar-progress'] });
    queryClient.invalidateQueries({ queryKey: ['erp-cycle-evolution'] });
    queryClient.invalidateQueries({ queryKey: ['erp-overdue-plans'] });
    queryClient.invalidateQueries({ queryKey: ['erp-recent-plans'] });
    queryClient.invalidateQueries({ queryKey: ['erp-project-stats'] });
  }, [queryClient]);

  return { invalidateAll };
}

// Hook for real-time updates
export function useERPRealtimeUpdates() {
  const { invalidateAll } = useERPQueryInvalidation();

  useEffect(() => {
    // Subscribe to action_plans changes
    const actionPlansChannel = supabase
      .channel('erp-action-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_plans'
        },
        () => {
          console.log('Action plans changed, invalidating ERP queries...');
          invalidateAll();
        }
      )
      .subscribe();

    // Subscribe to projects changes
    const projectsChannel = supabase
      .channel('erp-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          console.log('Projects changed, invalidating ERP queries...');
          invalidateAll();
        }
      )
      .subscribe();

    // Subscribe to project_tasks changes
    const tasksChannel = supabase
      .channel('erp-project-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks'
        },
        () => {
          console.log('Project tasks changed, invalidating ERP queries...');
          invalidateAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(actionPlansChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [invalidateAll]);
}

// Get overall ERP stats including projects
export function useERPStats() {
  return useQuery({
    queryKey: ['erp-stats'],
    queryFn: async () => {
      // Fetch action plans
      const { data: plans } = await supabase
        .from('action_plans')
        .select('*');

      // Fetch projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*');

      // Fetch project tasks for project completion calculation
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*');

      const now = new Date();
      
      // Action plans stats
      const plansList = plans || [];
      const completed = plansList.filter(p => p.status === 'COMPLETED');
      const inProgress = plansList.filter(p => p.status === 'IN_PROGRESS');
      const pending = plansList.filter(p => p.status === 'PENDING');
      const overdue = plansList.filter(p => {
        if (p.status === 'COMPLETED' || p.status === 'CANCELLED') return false;
        if (!p.due_date) return false;
        return new Date(p.due_date) < now;
      });

      // Calculate average completion time
      let avgCompletionDays: number | null = null;
      const completedWithDates = completed.filter(p => p.completed_at && p.created_at);
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((acc, p) => {
          const created = new Date(p.created_at);
          const completedAt = new Date(p.completed_at!);
          return acc + (completedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgCompletionDays = Math.round(totalDays / completedWithDates.length);
      }

      // Project stats
      const projectsList = projects || [];
      const activeProjects = projectsList.filter(p => 
        p.status === 'in_progress' || p.status === 'planning'
      );
      const completedProjects = projectsList.filter(p => p.status === 'completed');

      // Calculate project completion rate based on tasks
      let projectCompletionRate = 0;
      if (projectTasks && projectTasks.length > 0) {
        const completedTasks = projectTasks.filter(t => t.status === 'done');
        projectCompletionRate = Math.round((completedTasks.length / projectTasks.length) * 100);
      } else if (projectsList.length > 0) {
        projectCompletionRate = Math.round((completedProjects.length / projectsList.length) * 100);
      }

      return {
        totalPlans: plansList.length,
        completedPlans: completed.length,
        inProgressPlans: inProgress.length,
        pendingPlans: pending.length,
        overdueCount: overdue.length,
        completionRate: plansList.length > 0 ? Math.round((completed.length / plansList.length) * 100) : 0,
        avgCompletionDays,
        totalProjects: projectsList.length,
        activeProjects: activeProjects.length,
        projectCompletionRate,
      } as ERPStats;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

// Get project-level stats
export function useProjectStats() {
  return useQuery({
    queryKey: ['erp-project-stats'],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          destinations(name),
          project_tasks(id, status, due_date)
        `)
        .order('created_at', { ascending: false });

      if (!projects) return [];

      const now = new Date();
      
      return projects.map(project => {
        const tasks = (project.project_tasks as any[]) || [];
        const completedTasks = tasks.filter(t => t.status === 'done');
        const overdueTasks = tasks.filter(t => {
          if (t.status === 'done') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < now;
        });

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          methodology: project.methodology,
          destinationName: (project.destinations as any)?.name || 'N/A',
          completionRate: tasks.length > 0 
            ? Math.round((completedTasks.length / tasks.length) * 100) 
            : 0,
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          planned_end_date: project.planned_end_date,
        } as ProjectStats;
      });
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Get progress by pillar
export function usePillarProgress() {
  return useQuery({
    queryKey: ['erp-pillar-progress'],
    queryFn: async () => {
      const { data: plans } = await supabase
        .from('action_plans')
        .select('*');

      if (!plans) return [];

      const now = new Date();
      const pillars: ('RA' | 'OE' | 'AO')[] = ['RA', 'OE', 'AO'];

      return pillars.map(pillar => {
        const pillarPlans = plans.filter(p => p.pillar === pillar);
        const overdue = pillarPlans.filter(p => {
          if (p.status === 'COMPLETED' || p.status === 'CANCELLED') return false;
          if (!p.due_date) return false;
          return new Date(p.due_date) < now;
        });

        return {
          pillar,
          total: pillarPlans.length,
          completed: pillarPlans.filter(p => p.status === 'COMPLETED').length,
          inProgress: pillarPlans.filter(p => p.status === 'IN_PROGRESS').length,
          pending: pillarPlans.filter(p => p.status === 'PENDING').length,
          overdue: overdue.length,
        } as PillarProgress;
      });
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Get cycle evolution data with project info
export function useCycleEvolution(destinationId?: string) {
  return useQuery({
    queryKey: ['erp-cycle-evolution', destinationId],
    queryFn: async () => {
      let query = supabase
        .from('assessments')
        .select(`
          id,
          title,
          calculated_at,
          created_at,
          destination_id,
          destinations(name)
        `)
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: true });

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data: assessments } = await query;
      if (!assessments || assessments.length === 0) return [];

      // Get action plans for all assessments
      const assessmentIds = assessments.map(a => a.id);
      const { data: allPlans } = await supabase
        .from('action_plans')
        .select('*')
        .in('assessment_id', assessmentIds);

      // Get pillar scores for all assessments
      const { data: pillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      // Get prescription cycles for evolution state
      const { data: prescriptionCycles } = await supabase
        .from('prescription_cycles')
        .select('*')
        .in('assessment_id', assessmentIds);

      // Get projects for assessments
      const { data: projects } = await supabase
        .from('projects')
        .select('assessment_id, status')
        .in('assessment_id', assessmentIds);

      return assessments.map((assessment, index) => {
        const plans = allPlans?.filter(p => p.assessment_id === assessment.id) || [];
        const completedPlans = plans.filter(p => p.status === 'COMPLETED');
        
        const scores = pillarScores?.filter(ps => ps.assessment_id === assessment.id) || [];
        const avgScore = scores.length > 0 
          ? scores.reduce((acc, s) => acc + s.score, 0) / scores.length 
          : 0;

        // Determine evolution state from prescription cycles
        const cycles = prescriptionCycles?.filter(c => c.assessment_id === assessment.id) || [];
        let evolutionState: 'EVOLUTION' | 'STAGNATION' | 'REGRESSION' | null = null;
        if (cycles.length > 0) {
          const evolutionCount = cycles.filter(c => c.evolution_state === 'EVOLUTION').length;
          const regressionCount = cycles.filter(c => c.evolution_state === 'REGRESSION').length;
          if (evolutionCount > regressionCount) evolutionState = 'EVOLUTION';
          else if (regressionCount > evolutionCount) evolutionState = 'REGRESSION';
          else evolutionState = 'STAGNATION';
        }

        // Check if assessment has project
        const project = projects?.find(p => p.assessment_id === assessment.id);

        return {
          cycle: index + 1,
          assessmentId: assessment.id,
          title: assessment.title,
          date: assessment.calculated_at || assessment.created_at,
          plansCreated: plans.length,
          plansCompleted: completedPlans.length,
          completionRate: plans.length > 0 ? Math.round((completedPlans.length / plans.length) * 100) : 0,
          avgPillarScore: Math.round(avgScore * 100),
          evolutionState,
          hasProject: !!project,
          projectStatus: project?.status,
        } as CycleEvolution;
      });
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Get recent action plans with details
export function useRecentActionPlans(limit: number = 10) {
  return useQuery({
    queryKey: ['erp-recent-plans', limit],
    queryFn: async () => {
      const { data: plans } = await supabase
        .from('action_plans')
        .select(`
          *,
          assessments!inner(id, title, destinations(name))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!plans) return [];

      const now = new Date();
      return plans.map(plan => {
        const dueDate = plan.due_date ? new Date(plan.due_date) : null;
        const daysUntilDue = dueDate 
          ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && 
          plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED';

        return {
          id: plan.id,
          title: plan.title,
          status: plan.status,
          priority: plan.priority,
          pillar: plan.pillar,
          due_date: plan.due_date,
          created_at: plan.created_at,
          completed_at: plan.completed_at,
          owner: plan.owner,
          assessment: {
            id: (plan.assessments as any)?.id,
            title: (plan.assessments as any)?.title,
            destination: (plan.assessments as any)?.destinations?.name,
          },
          daysUntilDue,
          isOverdue,
        } as ActionPlanWithDetails;
      });
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Get overdue plans
export function useOverduePlans() {
  return useQuery({
    queryKey: ['erp-overdue-plans'],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0];
      
      const { data: plans } = await supabase
        .from('action_plans')
        .select(`
          *,
          assessments!inner(id, title, destinations(name))
        `)
        .lt('due_date', now)
        .neq('status', 'COMPLETED')
        .neq('status', 'CANCELLED')
        .order('due_date', { ascending: true });

      if (!plans) return [];

      const nowDate = new Date();
      return plans.map(plan => {
        const dueDate = new Date(plan.due_date!);
        const daysOverdue = Math.ceil((nowDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: plan.id,
          title: plan.title,
          status: plan.status,
          priority: plan.priority,
          pillar: plan.pillar,
          due_date: plan.due_date,
          created_at: plan.created_at,
          completed_at: plan.completed_at,
          owner: plan.owner,
          assessment: {
            id: (plan.assessments as any)?.id,
            title: (plan.assessments as any)?.title,
            destination: (plan.assessments as any)?.destinations?.name,
          },
          daysUntilDue: -daysOverdue,
          isOverdue: true,
        } as ActionPlanWithDetails;
      });
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
