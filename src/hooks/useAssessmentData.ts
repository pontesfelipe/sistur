import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ['assessment', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          destination:destinations(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function usePillarScores(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['pillar-scores', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data, error } = await supabase
        .from('pillar_scores')
        .select('*')
        .eq('assessment_id', assessmentId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!assessmentId,
  });
}

export function useIndicatorScores(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['indicator-scores', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data, error } = await supabase
        .from('indicator_scores')
        .select(`
          *,
          indicator:indicators(*)
        `)
        .eq('assessment_id', assessmentId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!assessmentId,
  });
}

export function useIssues(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['issues', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('severity', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!assessmentId,
  });
}

export function useRecommendations(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['recommendations', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          *,
          issue:issues(*),
          course:courses(*)
        `)
        .eq('assessment_id', assessmentId)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!assessmentId,
  });
}
