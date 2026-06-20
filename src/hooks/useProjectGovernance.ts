import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type RaciRole = "responsible" | "accountable" | "consulted" | "informed";
export type CheckpointStatus = "pending" | "submitted" | "approved" | "rejected";
export type EduEnrollmentStatus = "suggested" | "enrolled" | "in_progress" | "completed" | "waived";

export interface ProjectTaskRaci {
  id: string;
  project_id: string;
  task_id: string;
  user_id: string;
  user_name: string | null;
  role: RaciRole;
  created_at: string;
}

export interface ProjectCheckpoint {
  id: string;
  project_id: string;
  phase_id: string | null;
  name: string;
  description: string | null;
  pillar: "RA" | "OE" | "AO" | "GERAL" | null;
  is_mandatory: boolean;
  status: CheckpointStatus;
  evidence_url: string | null;
  evidence_notes: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  due_date: string | null;
  checkpoint_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectEduEnrollment {
  id: string;
  project_id: string;
  task_id: string | null;
  indicator_code: string | null;
  course_id: string | null;
  course_title: string;
  target_audience: string | null;
  user_id: string | null;
  user_name: string | null;
  enrollment_status: EduEnrollmentStatus;
  is_mandatory: boolean;
  completed_at: string | null;
  certificate_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectRaci(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-raci", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_task_raci" as any)
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data || []) as unknown as ProjectTaskRaci[];
    },
    enabled: !!projectId,
  });
}

export function useAddRaci() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<ProjectTaskRaci, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("project_task_raci" as any)
        .insert({ ...input, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["project-raci", data.project_id] });
      toast({ title: "Atribuição RACI adicionada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRaci() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_task_raci" as any).delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["project-raci", projectId] }),
  });
}

export function useProjectCheckpoints(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-checkpoints", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_checkpoints" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("checkpoint_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProjectCheckpoint[];
    },
    enabled: !!projectId,
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<ProjectCheckpoint> & { project_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("project_checkpoints" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["project-checkpoints", data.project_id] });
      toast({ title: "Checkpoint criado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCheckpoint() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, updates, action }: { id: string; updates: Partial<ProjectCheckpoint>; action?: "submit" | "approve" | "reject" }) => {
      const patch: any = { ...updates };
      if (action === "submit") {
        patch.status = "submitted";
        patch.submitted_by = user?.id;
        patch.submitted_at = new Date().toISOString();
      } else if (action === "approve") {
        patch.status = "approved";
        patch.approved_by = user?.id;
        patch.approved_at = new Date().toISOString();
      } else if (action === "reject") {
        patch.status = "rejected";
      }
      const { data, error } = await supabase
        .from("project_checkpoints" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["project-checkpoints", data.project_id] });
      toast({ title: "Checkpoint atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_checkpoints" as any).delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["project-checkpoints", projectId] }),
  });
}

export function useProjectEduEnrollments(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-edu", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_edu_enrollments" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProjectEduEnrollment[];
    },
    enabled: !!projectId,
  });
}

export function useCreateEduEnrollment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<ProjectEduEnrollment> & { project_id: string; course_title: string }) => {
      const { data, error } = await supabase
        .from("project_edu_enrollments" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["project-edu", data.project_id] });
      toast({ title: "Curso vinculado ao projeto" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateEduEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectEduEnrollment> }) => {
      const { data, error } = await supabase
        .from("project_edu_enrollments" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => qc.invalidateQueries({ queryKey: ["project-edu", data.project_id] }),
  });
}

export function useDeleteEduEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_edu_enrollments" as any).delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["project-edu", projectId] }),
  });
}

export const RACI_INFO: Record<RaciRole, { label: string; color: string; description: string }> = {
  responsible: { label: "R - Responsável", color: "bg-blue-500", description: "Executa a tarefa" },
  accountable: { label: "A - Aprovador", color: "bg-purple-500", description: "Aprova o resultado" },
  consulted: { label: "C - Consultado", color: "bg-amber-500", description: "Fornece input" },
  informed: { label: "I - Informado", color: "bg-slate-400", description: "Recebe atualizações" },
};

export const CHECKPOINT_STATUS_INFO: Record<CheckpointStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-slate-400" },
  submitted: { label: "Submetido", color: "bg-blue-500" },
  approved: { label: "Aprovado", color: "bg-green-500" },
  rejected: { label: "Rejeitado", color: "bg-red-500" },
};

export const EDU_ENROLLMENT_STATUS_INFO: Record<EduEnrollmentStatus, { label: string; color: string }> = {
  suggested: { label: "Sugerido", color: "bg-slate-400" },
  enrolled: { label: "Matriculado", color: "bg-blue-500" },
  in_progress: { label: "Em andamento", color: "bg-amber-500" },
  completed: { label: "Concluído", color: "bg-green-500" },
  waived: { label: "Dispensado", color: "bg-gray-400" },
};