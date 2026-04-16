import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StudentAssignment {
  id: string;
  classroom_id: string;
  classroom_name: string;
  professor_id: string;
  professor_name: string | null;
  assignment_type: 'track' | 'training' | 'exam' | 'custom';
  title: string;
  description: string | null;
  track_id: string | null;
  training_id: string | null;
  exam_ruleset_id: string | null;
  due_date: string | null;
  available_from: string | null;
  override_time_limit_minutes: number | null;
  override_max_attempts: number | null;
  override_min_score_pct: number | null;
  status: string;
  created_at: string;
  is_open: boolean;
  is_overdue: boolean;
  attempts_made: number;
  last_attempt_result: 'passed' | 'failed' | 'pending' | null;
}

export function useMyClassroomAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-classroom-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_classroom_assignments');
      if (error) throw error;
      return (data ?? []) as StudentAssignment[];
    },
    enabled: !!user?.id,
  });
}

export interface CanStartResult {
  allowed: boolean;
  reason?:
    | 'not_authenticated'
    | 'assignment_not_found'
    | 'not_enrolled'
    | 'not_targeted'
    | 'not_yet_open'
    | 'past_due'
    | 'max_attempts_reached';
  available_from?: string;
  due_date?: string;
  attempts_made?: number;
  max_attempts?: number;
  exam_ruleset_id?: string;
  override_time_limit_minutes?: number | null;
  override_min_score_pct?: number | null;
}

export function useCanStartAssignment() {
  return useMutation({
    mutationFn: async (assignmentId: string): Promise<CanStartResult> => {
      const { data, error } = await supabase.rpc('can_student_start_assignment', {
        p_assignment_id: assignmentId,
      });
      if (error) throw error;
      return data as unknown as CanStartResult;
    },
  });
}
