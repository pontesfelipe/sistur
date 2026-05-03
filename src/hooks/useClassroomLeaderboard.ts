import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  xp_week: number;
  total_xp: number;
  level: number;
  rank: number;
}

export function useClassroomLeaderboard(classroomId?: string) {
  return useQuery({
    queryKey: ['classroom-leaderboard', classroomId],
    enabled: !!classroomId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_classroom_weekly_leaderboard', {
        p_classroom_id: classroomId!,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });
}

export function useMyLeaderboardOptIn(classroomId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['leaderboard-opt-in', classroomId, user?.id],
    enabled: !!classroomId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_students')
        .select('leaderboard_opt_in')
        .eq('classroom_id', classroomId!)
        .eq('student_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data?.leaderboard_opt_in;
    },
  });
}

export function useToggleLeaderboardOptIn() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { classroom_id: string; opt_in: boolean }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('classroom_students')
        .update({ leaderboard_opt_in: input.opt_in })
        .eq('classroom_id', input.classroom_id)
        .eq('student_id', user.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['leaderboard-opt-in', vars.classroom_id] });
      qc.invalidateQueries({ queryKey: ['classroom-leaderboard', vars.classroom_id] });
      toast.success(vars.opt_in ? 'Você entrou no placar semanal!' : 'Você saiu do placar semanal');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao atualizar preferência'),
  });
}