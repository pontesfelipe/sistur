import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ClassroomOverviewRow {
  classroom_id: string;
  classroom_name: string;
  students_count: number;
  avg_total_xp: number;
  active_streaks: number;
  at_risk_count: number;
  avg_exam_score: number;
  completion_rate: number;
}

export function useProfessorClassroomOverview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['professor-classroom-overview', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_professor_classroom_overview', {
        p_professor_id: null,
      });
      if (error) throw error;
      return (data ?? []) as ClassroomOverviewRow[];
    },
  });
}

export interface OrgClassroomRankingRow extends ClassroomOverviewRow {
  professor_id: string;
  professor_name: string;
  rank: number;
}

export function useOrgClassroomRanking() {
  return useQuery({
    queryKey: ['org-classroom-ranking'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_org_classroom_ranking');
      if (error) throw error;
      return (data ?? []) as OrgClassroomRankingRow[];
    },
  });
}