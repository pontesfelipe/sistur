import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [destinations, assessments, issues, recommendations] = await Promise.all([
        supabase.from('destinations').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('severity', 'CRITICO'),
        supabase.from('recommendations').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalDestinations: destinations.count ?? 0,
        activeAssessments: assessments.count ?? 0,
        criticalIssues: issues.count ?? 0,
        pendingRecommendations: recommendations.count ?? 0,
      };
    },
  });
}

export function useLatestAssessment() {
  return useQuery({
    queryKey: ['latest-assessment'],
    queryFn: async () => {
      const { data: assessment } = await supabase
        .from('assessments')
        .select('*, destinations(name)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!assessment) return null;

      const { data: pillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .eq('assessment_id', assessment.id);

      const { data: issues } = await supabase
        .from('issues')
        .select('*')
        .eq('assessment_id', assessment.id)
        .order('severity', { ascending: true })
        .limit(3);

      return { assessment, pillarScores: pillarScores ?? [], issues: issues ?? [] };
    },
  });
}

export function useRecentAssessments() {
  return useQuery({
    queryKey: ['recent-assessments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('*, destinations(name)')
        .order('created_at', { ascending: false })
        .limit(2);

      return data ?? [];
    },
  });
}

export function useTopRecommendations() {
  return useQuery({
    queryKey: ['top-recommendations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recommendations')
        .select(`
          *,
          issues (id, title, pillar, severity, interpretation, evidence),
          courses (id, title, description, level, duration_minutes, url, tags)
        `)
        .order('priority', { ascending: true })
        .limit(2);

      // Transform to match the expected shape
      return (data ?? []).map(rec => ({
        ...rec,
        issue: rec.issues,
        course: rec.courses,
      }));
    },
  });
}
