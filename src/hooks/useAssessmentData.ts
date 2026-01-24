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

// Dynamic indicator scores hook that fetches from the correct table based on diagnostic_type
export function useIndicatorScores(assessmentId: string | undefined, diagnosticType?: string) {
  return useQuery({
    queryKey: ['indicator-scores', assessmentId, diagnosticType],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const isEnterprise = diagnosticType === 'enterprise';
      
      if (isEnterprise) {
        // Fetch from enterprise_indicator_scores with enterprise_indicators join
        const { data, error } = await supabase
          .from('enterprise_indicator_scores')
          .select(`
            id,
            org_id,
            assessment_id,
            indicator_id,
            score,
            min_ref_used,
            max_ref_used,
            weight_used,
            computed_at,
            indicator:enterprise_indicators(
              id,
              code,
              name,
              pillar,
              unit,
              description,
              benchmark_min,
              benchmark_max,
              benchmark_target,
              weight,
              minimum_tier,
              category:enterprise_indicator_categories(id, code, name)
            )
          `)
          .eq('assessment_id', assessmentId);
        
        if (error) throw error;
        
        // Transform to match territorial structure for consistent UI rendering
        return (data || []).map(score => ({
          ...score,
          indicator: score.indicator ? {
            ...score.indicator,
            theme: (score.indicator.category as any)?.name || 'Enterprise',
            direction: 'HIGH_IS_BETTER' as const,
            normalization: 'MIN_MAX' as const,
            min_ref: score.indicator.benchmark_min,
            max_ref: score.indicator.benchmark_max,
          } : null,
        }));
      } else {
        // Fetch from regular indicator_scores
        const { data, error } = await supabase
          .from('indicator_scores')
          .select(`
            *,
            indicator:indicators(*)
          `)
          .eq('assessment_id', assessmentId);
        
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!assessmentId,
  });
}

// Enterprise-specific indicator values hook
export function useEnterpriseIndicatorValuesForAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-indicator-values-assessment', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data: values, error: valuesError } = await supabase
        .from('enterprise_indicator_values')
        .select('*')
        .eq('assessment_id', assessmentId);
      
      if (valuesError) throw valuesError;
      
      if (!values || values.length === 0) return [];
      
      const indicatorIds = values.map(v => v.indicator_id);
      const { data: indicators, error: indicatorsError } = await supabase
        .from('enterprise_indicators')
        .select(`
          *,
          category:enterprise_indicator_categories(*)
        `)
        .in('id', indicatorIds);
      
      if (indicatorsError) throw indicatorsError;
      
      const indicatorMap = new Map(indicators?.map(i => [i.id, i]) || []);
      
      return values.map(v => ({
        ...v,
        value_raw: v.value, // Map to common interface
        indicator: indicatorMap.get(v.indicator_id) ? {
          ...indicatorMap.get(v.indicator_id),
          theme: (indicatorMap.get(v.indicator_id) as any)?.category?.name || 'Enterprise',
          direction: 'HIGH_IS_BETTER' as const,
          normalization: 'MIN_MAX' as const,
          min_ref: indicatorMap.get(v.indicator_id)?.benchmark_min,
          max_ref: indicatorMap.get(v.indicator_id)?.benchmark_max,
        } : null,
      }));
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
      
      // First fetch recommendations with issues
      const { data: recs, error } = await supabase
        .from('recommendations')
        .select(`
          *,
          issue:issues(*)
        `)
        .eq('assessment_id', assessmentId)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      if (!recs || recs.length === 0) return [];

      // Get unique training_ids to fetch from edu_trainings
      const trainingIds = [...new Set(recs.map(r => r.training_id).filter(Boolean))];
      
      let trainingsMap: Record<string, any> = {};
      if (trainingIds.length > 0) {
        const { data: trainings } = await supabase
          .from('edu_trainings')
          .select('*')
          .in('training_id', trainingIds);
        
        if (trainings) {
          trainingsMap = Object.fromEntries(trainings.map(t => [t.training_id, t]));
        }
      }

      // Also try legacy course_ids for backward compatibility
      const courseIds = [...new Set(recs.map(r => r.course_id).filter(Boolean))];
      let coursesMap: Record<string, any> = {};
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);
        
        if (courses) {
          coursesMap = Object.fromEntries(courses.map(c => [c.id, c]));
        }
      }

      // Enrich recommendations with training/course data
      return recs.map(rec => ({
        ...rec,
        training: rec.training_id ? trainingsMap[rec.training_id] : undefined,
        course: rec.course_id ? coursesMap[rec.course_id] : undefined,
      }));
    },
    enabled: !!assessmentId,
  });
}
