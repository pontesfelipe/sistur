import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EduTraining } from './useEduTrainings';
import type { Json } from '@/integrations/supabase/types';

export interface RecommendationReason {
  indicator_code: string;
  indicator_name: string;
  pillar: string;
  priority: number;
  reason_template: string;
  contribution_score: number;
}

export interface LearningRecommendation {
  id: string;
  entity_type: 'course' | 'live' | 'track';
  entity_id: string;
  score: number;
  reasons: RecommendationReason[];
  training?: EduTraining;
}

export interface LearningRun {
  id: string;
  user_id: string;
  territory_id?: string;
  inputs: {
    indicator_ids?: string[];
    indicator_codes?: string[];
  };
  org_id: string;
  created_at: string;
  recommendations?: LearningRecommendation[];
}

interface RecommendationInput {
  indicatorIds: string[];
  territoryId?: string;
}

interface RecommendationOutput {
  courses: LearningRecommendation[];
  lives: LearningRecommendation[];
  tracks: LearningRecommendation[];
}

// Main hook for generating recommendations using edu_indicator_training_map
export function useLearningRecommendations() {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);

  const generateRecommendations = useMutation({
    mutationFn: async (input: RecommendationInput): Promise<RecommendationOutput> => {
      setIsCalculating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // 1. Fetch indicator info for selected indicators (need codes for mapping)
      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, code, name, pillar')
        .in('id', input.indicatorIds);

      if (!indicators || indicators.length === 0) {
        throw new Error('Nenhum indicador encontrado');
      }

      const indicatorCodes = indicators.map(i => i.code);

      // 2. Create learning run
      const { data: run, error: runError } = await supabase
        .from('learning_runs')
        .insert({
          user_id: user.id,
          territory_id: input.territoryId || null,
          inputs: { 
            indicator_ids: input.indicatorIds,
            indicator_codes: indicatorCodes,
          },
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (runError) throw runError;

      // 3. Fetch training mappings from edu_indicator_training_map
      const { data: trainingMappings, error: mappingError } = await supabase
        .from('edu_indicator_training_map')
        .select('*')
        .in('indicator_code', indicatorCodes);

      if (mappingError) {
        console.error('Error fetching training mappings:', mappingError);
      }

      // 4. Get unique training IDs and fetch training details
      const trainingIds = [...new Set((trainingMappings || []).map(m => m.training_id))];
      
      const { data: trainings } = await supabase
        .from('edu_trainings')
        .select('*')
        .in('training_id', trainingIds)
        .eq('active', true);

      // 5. Calculate scores for each training
      const trainingScores: Record<string, { 
        score: number; 
        reasons: RecommendationReason[]; 
        training: EduTraining;
        type: string;
      }> = {};

      (trainingMappings || []).forEach((mapping) => {
        const training = trainings?.find(t => t.training_id === mapping.training_id);
        if (!training) return;

        const indicator = indicators.find(i => i.code === mapping.indicator_code);
        if (!indicator) return;

        const trainingId = mapping.training_id;
        
        if (!trainingScores[trainingId]) {
          trainingScores[trainingId] = {
            score: 0,
            reasons: [],
            training: training as EduTraining,
            type: training.type,
          };
        }

        // Score based on priority (higher priority = higher score)
        // Priority 1 = most important, so we invert it
        const priorityScore = (10 - Math.min(mapping.priority, 10)) * 10;
        trainingScores[trainingId].score += priorityScore;
        
        // Build reason from template
        const reasonText = mapping.reason_template
          .replace('{indicator}', indicator.name)
          .replace('{status}', 'selecionado')
          .replace('{pillar}', mapping.pillar);

        trainingScores[trainingId].reasons.push({
          indicator_code: mapping.indicator_code,
          indicator_name: indicator.name,
          pillar: mapping.pillar,
          priority: mapping.priority,
          reason_template: reasonText,
          contribution_score: priorityScore,
        });
      });

      // 6. Normalize and separate by type
      const allScores = Object.values(trainingScores);
      const maxScore = Math.max(...allScores.map(s => s.score), 1);

      const courseRecommendations: LearningRecommendation[] = [];
      const liveRecommendations: LearningRecommendation[] = [];

      Object.entries(trainingScores).forEach(([trainingId, data]) => {
        const rec: LearningRecommendation = {
          id: '',
          entity_type: data.type === 'live' ? 'live' : 'course',
          entity_id: trainingId,
          score: (data.score / maxScore) * 100,
          reasons: data.reasons,
          training: data.training,
        };

        if (data.type === 'live') {
          liveRecommendations.push(rec);
        } else {
          courseRecommendations.push(rec);
        }
      });

      // Sort by score
      courseRecommendations.sort((a, b) => b.score - a.score);
      liveRecommendations.sort((a, b) => b.score - a.score);

      // 7. Track recommendations (based on course pillar coverage)
      const trackRecommendations: LearningRecommendation[] = [];

      // 8. Save recommendations to database
      const allRecommendations = [
        ...courseRecommendations.slice(0, 10),
        ...liveRecommendations.slice(0, 15),
      ];

      if (allRecommendations.length > 0) {
        const { error: insertError } = await supabase
          .from('learning_recommendations')
          .insert(
            allRecommendations.map(rec => ({
              run_id: run.id,
              entity_type: rec.entity_type,
              entity_id: rec.entity_id,
              score: rec.score,
              reasons: JSON.parse(JSON.stringify(rec.reasons)) as Json,
            }))
          );

        if (insertError) {
          console.error('Error saving recommendations:', insertError);
        }
      }

      setIsCalculating(false);

      return {
        courses: courseRecommendations,
        lives: liveRecommendations,
        tracks: trackRecommendations,
      };
    },
    onError: (error) => {
      setIsCalculating(false);
      toast.error(`Erro ao gerar recomendações: ${error.message}`);
    },
  });

  return {
    generateRecommendations,
    isCalculating,
  };
}

// Hook for fetching past learning runs
export function useLearningRuns() {
  return useQuery({
    queryKey: ['learning-runs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('learning_runs')
        .select(`
          *,
          territory:destinations(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

// Hook for fetching a specific learning run with recommendations
export function useLearningRun(runId?: string) {
  return useQuery({
    queryKey: ['learning-run', runId],
    queryFn: async () => {
      if (!runId) return null;

      const { data: run, error: runError } = await supabase
        .from('learning_runs')
        .select(`
          *,
          territory:destinations(name)
        `)
        .eq('id', runId)
        .single();

      if (runError) throw runError;

      const { data: recommendations, error: recError } = await supabase
        .from('learning_recommendations')
        .select('*')
        .eq('run_id', runId)
        .order('score', { ascending: false });

      if (recError) throw recError;

      // Fetch training details for each recommendation
      const trainingIds = recommendations
        ?.filter(r => r.entity_type === 'course' || r.entity_type === 'live')
        .map(r => r.entity_id) || [];

      const { data: trainings } = await supabase
        .from('edu_trainings')
        .select('*')
        .in('training_id', trainingIds);

      const enrichedRecommendations = (recommendations || []).map(rec => {
        const training = trainings?.find(t => t.training_id === rec.entity_id);
        return {
          ...rec,
          training: training as EduTraining | undefined,
          reasons: (rec.reasons || []) as unknown as RecommendationReason[],
        };
      });

      return {
        ...run,
        inputs: run.inputs as LearningRun['inputs'],
        recommendations: enrichedRecommendations,
      } as LearningRun;
    },
    enabled: !!runId,
  });
}
