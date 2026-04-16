import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StudentAssignmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_grading'
  | 'failed_can_retry'
  | 'exhausted'
  | 'passed';

export interface AssignmentStudentRow {
  student_id: string;
  student_name: string;
  attempts_made: number;
  max_attempts: number;
  best_score: number | null;
  last_result: 'passed' | 'failed' | 'pending' | null;
  last_submitted_at: string | null;
  last_attempt_id: string | null;
  first_started_at: string | null;
  has_passed: boolean;
  status: StudentAssignmentStatus;
}

export interface AssignmentProgress {
  assignment: {
    id: string;
    title: string;
    assignment_type: string;
    classroom_id: string;
    available_from: string | null;
    due_date: string | null;
    max_attempts: number;
    min_score_pct: number;
  };
  kpis: {
    total_students: number;
    started: number;
    submitted: number;
    passed: number;
    failed: number;
    pending_grading: number;
    exhausted: number;
    not_started: number;
    avg_score: number;
    completion_rate: number;
    pass_rate: number;
  };
  students: AssignmentStudentRow[];
}

export function useAssignmentProgress(assignmentId: string | null) {
  return useQuery({
    queryKey: ['assignment-progress', assignmentId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_assignment_progress', {
        p_assignment_id: assignmentId,
      });
      if (error) throw error;
      return data as AssignmentProgress;
    },
    enabled: !!assignmentId,
  });
}

export function useExtendDueDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, newDueDate }: { assignmentId: string; newDueDate: string }) => {
      const { error } = await (supabase.rpc as any)('extend_assignment_due_date', {
        p_assignment_id: assignmentId,
        p_new_due_date: newDueDate,
      });
      if (error) throw error;
    },
    onSuccess: (_, { assignmentId }) => {
      qc.invalidateQueries({ queryKey: ['assignment-progress', assignmentId] });
      qc.invalidateQueries({ queryKey: ['classroom-assignments'] });
      toast.success('Prazo prorrogado e alunos notificados');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao prorrogar prazo'),
  });
}

export function useGrantExtraAttempts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, extraCount }: { assignmentId: string; extraCount: number }) => {
      const { data, error } = await (supabase.rpc as any)('grant_extra_attempts', {
        p_assignment_id: assignmentId,
        p_extra_count: extraCount,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (newMax, { assignmentId }) => {
      qc.invalidateQueries({ queryKey: ['assignment-progress', assignmentId] });
      qc.invalidateQueries({ queryKey: ['classroom-assignments'] });
      toast.success(`Tentativas atualizadas para ${newMax}`);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao liberar tentativas'),
  });
}

export function useSendAssignmentReminder() {
  return useMutation({
    mutationFn: async ({
      assignmentId,
      mode,
      customMessage,
    }: {
      assignmentId: string;
      mode: 'not_started' | 'not_submitted' | 'all_pending';
      customMessage?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('send_assignment_reminder', {
        p_assignment_id: assignmentId,
        p_mode: mode,
        p_custom_message: customMessage || null,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(count > 0 ? `Lembrete enviado para ${count} aluno(s)` : 'Nenhum aluno pendente');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar lembretes'),
  });
}
