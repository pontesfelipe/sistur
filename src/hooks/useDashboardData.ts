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
        .maybeSingle();

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

// Aggregated pillar scores across all calculated assessments
export function useAggregatedPillarScores() {
  return useQuery({
    queryKey: ['aggregated-pillar-scores'],
    queryFn: async () => {
      // Get all calculated assessments
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, destinations(name)')
        .eq('status', 'CALCULATED');

      if (!assessments || assessments.length === 0) return null;

      // Get all pillar scores for calculated assessments
      const assessmentIds = assessments.map(a => a.id);
      const { data: allPillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (!allPillarScores || allPillarScores.length === 0) return null;

      // Aggregate by pillar - calculate average scores
      const pillarAggregates: Record<string, { scores: number[], severities: string[] }> = {};
      
      allPillarScores.forEach(ps => {
        if (!pillarAggregates[ps.pillar]) {
          pillarAggregates[ps.pillar] = { scores: [], severities: [] };
        }
        pillarAggregates[ps.pillar].scores.push(ps.score);
        pillarAggregates[ps.pillar].severities.push(ps.severity);
      });

      const aggregatedScores = Object.entries(pillarAggregates).map(([pillar, data]) => {
        const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        // Determine severity based on average score
        let severity: 'CRITICO' | 'MODERADO' | 'BOM' = 'BOM';
        if (avgScore <= 0.33) severity = 'CRITICO';
        else if (avgScore <= 0.66) severity = 'MODERADO';
        
        return {
          id: pillar,
          pillar: pillar as 'RA' | 'OE' | 'AO',
          score: avgScore,
          severity,
          count: data.scores.length,
        };
      });

      return {
        pillarScores: aggregatedScores,
        totalAssessments: assessments.length,
        assessments: assessments.map(a => ({
          id: a.id,
          title: a.title,
          destination: (a.destinations as any)?.name
        }))
      };
    },
  });
}

// Aggregated issues across all assessments
export function useAggregatedIssues() {
  return useQuery({
    queryKey: ['aggregated-issues'],
    queryFn: async () => {
      const { data: issues } = await supabase
        .from('issues')
        .select(`
          *,
          assessments!inner(title, status, destinations(name))
        `)
        .eq('assessments.status', 'CALCULATED')
        .order('severity', { ascending: true })
        .limit(5);

      return issues ?? [];
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
