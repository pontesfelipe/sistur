import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSeverityFromScore } from '@/lib/igmaEngine';
import { useProfileContext } from '@/contexts/ProfileContext';

export function useDashboardStats() {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['dashboard-stats', effectiveOrgId],
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
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['latest-assessment', effectiveOrgId],
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
export function useAggregatedPillarScores(destinationId?: string) {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['aggregated-pillar-scores', effectiveOrgId, destinationId],
    queryFn: async () => {
      // Get all calculated assessments, optionally filtered by destination
      let query = supabase
        .from('assessments')
        .select('id, title, destination_id, destinations(name)')
        .eq('status', 'CALCULATED');

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data: assessments } = await query;

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

      // Get unique destinations from the filtered assessments
      const uniqueDestinations = new Map<string, string>();
      assessments.forEach(a => {
        if (a.destination_id && (a.destinations as any)?.name) {
          uniqueDestinations.set(a.destination_id, (a.destinations as any).name);
        }
      });

      return {
        pillarScores: aggregatedScores,
        totalAssessments: assessments.length,
        assessments: assessments.map(a => ({
          id: a.id,
          title: a.title,
          destinationId: a.destination_id,
          destination: (a.destinations as any)?.name
        })),
        destinations: Array.from(uniqueDestinations.entries()).map(([id, name]) => ({ id, name }))
      };
    },
  });
}

// Get pillar scores for a specific destination (for comparison)
export function useDestinationPillarScores(destinationId: string | undefined) {
  return useQuery({
    queryKey: ['destination-pillar-scores', destinationId],
    queryFn: async () => {
      if (!destinationId) return null;

      // Get all calculated assessments for this destination
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id')
        .eq('destination_id', destinationId)
        .eq('status', 'CALCULATED');

      if (!assessments || assessments.length === 0) return null;

      // Get pillar scores for these assessments
      const assessmentIds = assessments.map(a => a.id);
      const { data: pillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (!pillarScores || pillarScores.length === 0) return null;

      // Average by pillar
      const pillarAggregates: Record<string, number[]> = {};
      pillarScores.forEach(ps => {
        if (!pillarAggregates[ps.pillar]) {
          pillarAggregates[ps.pillar] = [];
        }
        pillarAggregates[ps.pillar].push(ps.score);
      });

      return Object.entries(pillarAggregates).map(([pillar, scores]) => {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
          pillar: pillar as 'RA' | 'OE' | 'AO',
          score: avgScore,
          severity: getSeverityFromScore(avgScore),
        };
      });
    },
    enabled: !!destinationId,
  });
}

// Get all destinations that have calculated assessments
export function useDestinationsWithAssessments() {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['destinations-with-assessments', effectiveOrgId],
    queryFn: async () => {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('destination_id, destinations(id, name)')
        .eq('status', 'CALCULATED');

      if (!assessments) return [];

      // Get unique destinations
      const uniqueDestinations = new Map<string, string>();
      assessments.forEach(a => {
        const dest = a.destinations as any;
        if (dest?.id && dest?.name) {
          uniqueDestinations.set(dest.id, dest.name);
        }
      });

      return Array.from(uniqueDestinations.entries()).map(([id, name]) => ({ id, name }));
    },
  });
}

// Aggregated issues across all assessments
export function useAggregatedIssues(destinationId?: string) {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['aggregated-issues', effectiveOrgId, destinationId],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select(`
          *,
          assessments!inner(title, status, destination_id, destinations(name))
        `)
        .eq('assessments.status', 'CALCULATED');

      if (destinationId) {
        query = query.eq('assessments.destination_id', destinationId);
      }

      const { data: issues } = await query
        .order('severity', { ascending: true })
        .limit(5);

      return issues ?? [];
    },
  });
}

export function useRecentAssessments() {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['recent-assessments', effectiveOrgId],
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
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['top-recommendations', effectiveOrgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('recommendations')
        .select(`
          *,
          issues (id, title, pillar, severity, interpretation, evidence),
          courses (id, title, description, level, duration_minutes, url, tags),
          edu_trainings (training_id, title, description, type, pillar, level, duration_minutes, video_url, target_audience, tags, course_code)
        `)
        .order('priority', { ascending: true })
        .limit(5);

      // Transform to match the expected shape
      return (data ?? []).map(rec => ({
        ...rec,
        issue: rec.issues,
        course: rec.courses,
        training: rec.edu_trainings,
      }));
    },
  });
}
