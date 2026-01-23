import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';

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
  avgScore: number;
  totalAssessments: number;
  destinations: {
    id: string;
    name: string;
    score: number;
    assessmentCount: number;
  }[];
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
    queryClient.invalidateQueries({ queryKey: ['erp-overdue-projects'] });
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
  const { effectiveOrgId } = useProfileContext();
  
  return useQuery({
    queryKey: ['erp-stats', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;

      // Fetch action plans filtered by org
      const { data: plans } = await supabase
        .from('action_plans')
        .select('*, assessments!inner(org_id)')
        .eq('assessments.org_id', effectiveOrgId);

      // Fetch projects filtered by org
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', effectiveOrgId);

      // Get project IDs first
      const projectIds = (projects || []).map(p => p.id);

      // Fetch project tasks for these projects only
      let projectTasks: any[] = [];
      if (projectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('project_tasks')
          .select('*')
          .in('project_id', projectIds);
        projectTasks = tasks || [];
      }

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
    enabled: !!effectiveOrgId,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

// Get project-level stats
export function useProjectStats() {
  const { effectiveOrgId } = useProfileContext();
  
  return useQuery({
    queryKey: ['erp-project-stats', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];

      // IMPORTANT: avoid embedded selects here; they can silently fail if related tables
      // have different RLS/permissions, which makes the UI show "Nenhum projeto".
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, methodology, destination_id, planned_end_date, created_at')
        .eq('org_id', effectiveOrgId)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);
      const destinationIds = Array.from(
        new Set(projects.map((p: any) => p.destination_id).filter(Boolean))
      );

      const [{ data: tasks, error: tasksError }, { data: destinationsData, error: destinationsError }] =
        await Promise.all([
          supabase
            .from('project_tasks')
            .select('id, project_id, status, due_date')
            .in('project_id', projectIds),
          destinationIds.length > 0
            ? supabase
                .from('destinations')
                .select('id, name')
                .in('id', destinationIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

      // Don't block rendering projects if related data fails (common with RLS differences).
      const safeTasks = tasksError ? [] : (tasks || []);
      const safeDestinations = destinationsError ? [] : (destinationsData || []);
      if (tasksError) console.warn('useProjectStats: could not load project_tasks', tasksError);
      if (destinationsError) console.warn('useProjectStats: could not load destinations', destinationsError);

      const tasksByProject = new Map<string, any[]>();
      safeTasks.forEach((t: any) => {
        const list = tasksByProject.get(t.project_id) || [];
        list.push(t);
        tasksByProject.set(t.project_id, list);
      });

      const destinationNameById = new Map<string, string>();
      safeDestinations.forEach((d: any) => {
        destinationNameById.set(d.id, d.name);
      });

      const now = new Date();

      return projects.map((project: any) => {
        const tasksForProject = tasksByProject.get(project.id) || [];
        const completedTasks = tasksForProject.filter((t) => t.status === 'done');
        const overdueTasks = tasksForProject.filter((t) => {
          if (t.status === 'done') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < now;
        });

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          methodology: project.methodology,
          destinationName: project.destination_id
            ? destinationNameById.get(project.destination_id) || 'N/A'
            : 'N/A',
          completionRate:
            tasksForProject.length > 0
              ? Math.round((completedTasks.length / tasksForProject.length) * 100)
              : 0,
          totalTasks: tasksForProject.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          planned_end_date: project.planned_end_date,
        } as ProjectStats;
      });
    },
    enabled: !!effectiveOrgId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Get progress by pillar based on assessment pillar_scores
export function usePillarProgress(diagnosticType?: 'territorial' | 'enterprise') {
  return useQuery({
    queryKey: ['erp-pillar-progress', diagnosticType],
    queryFn: async () => {
      // Fetch calculated assessments with pillar scores
      let query = supabase
        .from('assessments')
        .select(`
          id,
          destination_id,
          diagnostic_type,
          destinations(id, name),
          pillar_scores(pillar, score)
        `)
        .eq('status', 'CALCULATED');

      // Filter by diagnostic type if specified
      if (diagnosticType) {
        query = query.eq('diagnostic_type', diagnosticType);
      }

      const { data: assessments } = await query;

      if (!assessments || assessments.length === 0) return [];

      const pillars: ('RA' | 'OE' | 'AO')[] = ['RA', 'OE', 'AO'];

      return pillars.map(pillar => {
        // Group scores by destination for this pillar
        const destinationScores: Record<string, { 
          id: string; 
          name: string; 
          scores: number[]; 
        }> = {};

        assessments.forEach(assessment => {
          const destination = assessment.destinations as any;
          if (!destination) return;

          const pillarScore = (assessment.pillar_scores as any[])?.find(
            ps => ps.pillar === pillar
          );
          
          if (pillarScore) {
            if (!destinationScores[destination.id]) {
              destinationScores[destination.id] = {
                id: destination.id,
                name: destination.name,
                scores: [],
              };
            }
            destinationScores[destination.id].scores.push(pillarScore.score);
          }
        });

        // Calculate averages per destination
        const destinations = Object.values(destinationScores).map(dest => ({
          id: dest.id,
          name: dest.name,
          score: dest.scores.reduce((a, b) => a + b, 0) / dest.scores.length,
          assessmentCount: dest.scores.length,
        }));

        // Calculate overall average for this pillar
        const allScores = destinations.flatMap(d => 
          Array(d.assessmentCount).fill(d.score)
        );
        const avgScore = allScores.length > 0 
          ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
          : 0;

        return {
          pillar,
          avgScore,
          totalAssessments: allScores.length,
          destinations: destinations.sort((a, b) => b.score - a.score),
        } as PillarProgress;
      });
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Get cycle evolution data with project info
export function useCycleEvolution(destinationId?: string, diagnosticType?: 'territorial' | 'enterprise') {
  return useQuery({
    queryKey: ['erp-cycle-evolution', destinationId, diagnosticType],
    queryFn: async () => {
      let query = supabase
        .from('assessments')
        .select(`
          id,
          title,
          calculated_at,
          created_at,
          destination_id,
          diagnostic_type,
          destinations(name)
        `)
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: true });

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      // Filter by diagnostic type if specified
      if (diagnosticType) {
        query = query.eq('diagnostic_type', diagnosticType);
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

// Overdue project interface
export interface OverdueProject {
  id: string;
  name: string;
  status: string;
  methodology: string;
  destinationName: string;
  planned_end_date: string;
  daysOverdue: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

// Get overdue projects
export function useOverdueProjects() {
  return useQuery({
    queryKey: ['erp-overdue-projects'],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0];
      
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          destinations(name),
          project_tasks(id, status)
        `)
        .lt('planned_end_date', now)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('planned_end_date', { ascending: true });

      if (!projects) return [];

      const nowDate = new Date();
      return projects.map(project => {
        const endDate = new Date(project.planned_end_date!);
        const daysOverdue = Math.ceil((nowDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        const tasks = (project.project_tasks as any[]) || [];
        const completedTasks = tasks.filter(t => t.status === 'done').length;

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          methodology: project.methodology,
          destinationName: (project.destinations as any)?.name || 'N/A',
          planned_end_date: project.planned_end_date,
          daysOverdue,
          totalTasks: tasks.length,
          completedTasks,
          completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        } as OverdueProject;
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
