import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';

// =========================================================
// Types
// =========================================================
export type ProjectMemberRole = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  added_by: string | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  avatar_url?: string | null;
}

export interface OrgUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  user_name: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  project_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: unknown;
  created_at: string;
}

export type RaciRole = 'R' | 'A' | 'C' | 'I';

export interface TaskRaciEntry {
  id: string;
  project_id: string;
  task_id: string;
  user_id: string;
  user_name: string | null;
  role: RaciRole | string;
  created_at: string;
  created_by: string | null;
}

// =========================================================
// Org users (people that can be assigned)
// =========================================================
export function useOrgUsers() {
  const { profile } = useProfileContext();
  const orgId = profile?.org_id;
  return useQuery({
    queryKey: ['org-users', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('org_id', orgId!)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data || []) as OrgUser[];
    },
  });
}

// =========================================================
// Project members
// =========================================================
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const members = (data || []) as ProjectMember[];
      const ids = members.map((m) => m.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', ids);
        const map = new Map((profs || []).map((p) => [p.user_id, p]));
        members.forEach((m) => {
          const p = map.get(m.user_id);
          m.user_name = p?.full_name || null;
          m.avatar_url = p?.avatar_url || null;
        });
      }
      return members;
    },
  });
}

export function useAddProjectMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ projectId, userId, role }: { projectId: string; userId: string; role: ProjectMemberRole }) => {
      const { data, error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role, added_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['project-members', data.project_id] });
      toast({ title: 'Membro adicionado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao adicionar membro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateProjectMember() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, role, projectId }: { id: string; role: ProjectMemberRole; projectId: string }) => {
      const { data, error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, projectId };
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['project-members', d.projectId] });
      toast({ title: 'Papel atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveProjectMember() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_members').delete().eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast({ title: 'Membro removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

// =========================================================
// Permissions helper (client-side hint; RLS is authoritative)
// =========================================================
export function useMyProjectRole(projectId: string | undefined): {
  role: ProjectMemberRole | null;
  isLoading: boolean;
  canEditProject: boolean;
  canManage: boolean;
} {
  const { user } = useAuth();
  const { data: members, isLoading } = useProjectMembers(projectId);
  const role = (members?.find((m) => m.user_id === user?.id)?.role as ProjectMemberRole) || null;
  const canEditProject = role === 'owner' || role === 'editor';
  const canManage = role === 'owner';
  return { role, isLoading, canEditProject, canManage };
}

// =========================================================
// Task comments
// =========================================================
export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('project_task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as TaskComment[];
    },
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ taskId, projectId, body }: { taskId: string; projectId: string; body: string }) => {
      const { data, error } = await supabase
        .from('project_task_comments')
        .insert({
          task_id: taskId,
          project_id: projectId,
          user_id: user?.id || '',
          user_name: profile?.full_name || null,
          body,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
    },
    onError: (e: any) => toast({ title: 'Erro ao comentar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from('project_task_comments').delete().eq('id', id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
  });
}

// =========================================================
// Task activity
// =========================================================
export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('project_task_activity')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as TaskActivity[];
    },
  });
}

// =========================================================
// RACI per task
// =========================================================
export function useTaskRaci(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-raci', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('project_task_raci')
        .select('*')
        .eq('task_id', taskId);
      if (error) throw error;
      return (data || []) as TaskRaciEntry[];
    },
  });
}

export function useAddTaskRaci() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      projectId, taskId, userId, userName, role,
    }: { projectId: string; taskId: string; userId: string; userName?: string | null; role: RaciRole }) => {
      const { data, error } = await supabase
        .from('project_task_raci')
        .insert({
          project_id: projectId, task_id: taskId, user_id: userId,
          user_name: userName || null, role, created_by: user?.id || null,
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => qc.invalidateQueries({ queryKey: ['task-raci', d.task_id] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveTaskRaci() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from('project_task_raci').delete().eq('id', id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => qc.invalidateQueries({ queryKey: ['task-raci', taskId] }),
  });
}

// =========================================================
// My tasks (across all projects in my org)
// =========================================================
export function useMyTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-tasks', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Tasks where I am the assignee
      const { data: assigned, error: e1 } = await supabase
        .from('project_tasks')
        .select('*, project:projects(id, name, org_id)')
        .eq('assignee_id', user!.id)
        .order('planned_end_date', { ascending: true, nullsFirst: false });
      if (e1) throw e1;

      // Tasks where I am R or A in RACI
      const { data: raci, error: e2 } = await supabase
        .from('project_task_raci')
        .select('task_id, role')
        .eq('user_id', user!.id)
        .in('role', ['R', 'A']);
      if (e2) throw e2;

      const raciIds = Array.from(new Set((raci || []).map((r: any) => r.task_id)));
      const seen = new Set((assigned || []).map((t: any) => t.id));
      const missing = raciIds.filter((id) => !seen.has(id));
      let extra: any[] = [];
      if (missing.length) {
        const { data, error } = await supabase
          .from('project_tasks')
          .select('*, project:projects(id, name, org_id)')
          .in('id', missing);
        if (error) throw error;
        extra = data || [];
      }
      return [...(assigned || []), ...extra];
    },
  });
}