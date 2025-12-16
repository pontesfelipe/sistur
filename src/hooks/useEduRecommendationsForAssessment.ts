import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EduTraining } from './useEduTrainings';

export interface EduRecommendation {
  training: EduTraining;
  indicatorCode: string;
  indicatorName: string;
  pillar: string;
  priority: number;
  reasonTemplate: string;
  status: string;
}

interface IndicatorScore {
  id: string;
  indicator_id: string;
  score: number;
  indicator?: {
    id: string;
    code: string;
    name: string;
    pillar: string;
  };
}

// Hook for fetching EDU recommendations based on indicator scores
export function useEduRecommendationsForAssessment(indicatorScores: IndicatorScore[]) {
  return useQuery({
    queryKey: ['edu-recommendations-assessment', indicatorScores.map(s => s.indicator_id)],
    queryFn: async () => {
      if (!indicatorScores || indicatorScores.length === 0) return [];

      // Filter indicators with low scores (critical < 0.34, attention 0.34-0.66)
      const criticalIndicators = indicatorScores.filter(s => s.score < 0.34);
      const attentionIndicators = indicatorScores.filter(s => s.score >= 0.34 && s.score < 0.67);

      // Get indicator codes for mapping lookup
      const indicatorIds = [
        ...criticalIndicators.map(s => s.indicator_id),
        ...attentionIndicators.map(s => s.indicator_id),
      ];

      if (indicatorIds.length === 0) return [];

      // Fetch indicator details to get codes
      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, code, name, pillar')
        .in('id', indicatorIds);

      if (!indicators || indicators.length === 0) return [];

      const indicatorCodes = indicators.map(i => i.code);

      // Fetch training mappings
      const { data: mappings } = await supabase
        .from('edu_indicator_training_map')
        .select('*')
        .in('indicator_code', indicatorCodes)
        .order('priority', { ascending: true });

      if (!mappings || mappings.length === 0) return [];

      // Get unique training IDs
      const trainingIds = [...new Set(mappings.map(m => m.training_id))];

      // Fetch trainings
      const { data: trainings } = await supabase
        .from('edu_trainings')
        .select('*')
        .in('training_id', trainingIds)
        .eq('active', true);

      if (!trainings) return [];

      // Build recommendations with context
      const recommendations: EduRecommendation[] = [];

      mappings.forEach(mapping => {
        const training = trainings.find(t => t.training_id === mapping.training_id);
        const indicator = indicators.find(i => i.code === mapping.indicator_code);
        const score = indicatorScores.find(s => s.indicator_id === indicator?.id);

        if (!training || !indicator) return;

        // Determine status based on score
        const status = score && score.score < 0.34 ? 'CRÍTICO' : 'ATENÇÃO';

        // Build reason from template
        const reasonText = mapping.reason_template
          .replace('{indicator}', indicator.name)
          .replace('{status}', status)
          .replace('{pillar}', mapping.pillar);

        // Check if this training is already in recommendations
        const existing = recommendations.find(r => r.training.training_id === training.training_id);
        
        // Only add if not already present or if this has higher priority
        if (!existing) {
          recommendations.push({
            training: training as EduTraining,
            indicatorCode: mapping.indicator_code,
            indicatorName: indicator.name,
            pillar: mapping.pillar,
            priority: mapping.priority,
            reasonTemplate: reasonText,
            status,
          });
        }
      });

      // Sort by priority (lower number = higher priority)
      recommendations.sort((a, b) => a.priority - b.priority);

      return recommendations;
    },
    enabled: indicatorScores.length > 0,
  });
}
