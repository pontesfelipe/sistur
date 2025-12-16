import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pillar } from '@/types/sistur';

// Types for the new edu_trainings structure
export interface TrainingModule {
  module_number: number;
  module_title: string;
  lives: string[];
}

export interface EduTraining {
  training_id: string;
  title: string;
  type: string;
  pillar: string;
  level: string | null;
  target_audience: string | null;
  course_code: string | null;
  objective: string | null;
  modules: TrainingModule[] | unknown;
  aliases: unknown;
  source: string | null;
  active: boolean;
  org_id: string | null;
  created_at: string;
}

export interface IndicatorTrainingMapping {
  id: string;
  indicator_code: string;
  training_id: string;
  pillar: string;
  status_trigger: string[];
  interpretation_trigger: string | null;
  priority: number;
  reason_template: string;
  created_at: string;
  training?: EduTraining;
}

// ============================================
// EDU TRAININGS (Unified courses + lives)
// ============================================
export function useEduTrainings(type?: 'course' | 'live', pillar?: Pillar) {
  return useQuery({
    queryKey: ['edu-trainings', type, pillar],
    queryFn: async () => {
      let query = supabase
        .from('edu_trainings')
        .select('*')
        .eq('active', true)
        .order('title', { ascending: true });
      
      if (type) {
        query = query.eq('type', type);
      }
      if (pillar) {
        query = query.eq('pillar', pillar);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EduTraining[];
    },
  });
}

export function useEduTraining(trainingId?: string) {
  return useQuery({
    queryKey: ['edu-training', trainingId],
    queryFn: async () => {
      if (!trainingId) return null;
      
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('*')
        .eq('training_id', trainingId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EduTraining | null;
    },
    enabled: !!trainingId,
  });
}

// ============================================
// INDICATOR → TRAINING MAPPINGS
// ============================================
export function useIndicatorTrainingMappings() {
  return useQuery({
    queryKey: ['indicator-training-mappings'],
    queryFn: async () => {
      const { data: mappings, error: mappingsError } = await supabase
        .from('edu_indicator_training_map')
        .select('*')
        .order('priority', { ascending: true });
      
      if (mappingsError) throw mappingsError;
      
      // Fetch all trainings to join
      const { data: trainings, error: trainingsError } = await supabase
        .from('edu_trainings')
        .select('*')
        .eq('active', true);
      
      if (trainingsError) throw trainingsError;
      
      const trainingsMap = new Map(trainings?.map(t => [t.training_id, t]) || []);
      
      return (mappings || []).map(m => ({
        ...m,
        training: trainingsMap.get(m.training_id) as EduTraining | undefined,
      })) as IndicatorTrainingMapping[];
    },
  });
}

// Get trainings recommended for specific indicator codes
export function useTrainingsForIndicators(indicatorCodes: string[]) {
  return useQuery({
    queryKey: ['trainings-for-indicators', indicatorCodes],
    queryFn: async () => {
      if (!indicatorCodes.length) return [];
      
      const { data: mappings, error: mappingsError } = await supabase
        .from('edu_indicator_training_map')
        .select('*')
        .in('indicator_code', indicatorCodes)
        .order('priority', { ascending: true });
      
      if (mappingsError) throw mappingsError;
      
      const trainingIds = [...new Set(mappings?.map(m => m.training_id) || [])];
      
      const { data: trainings, error: trainingsError } = await supabase
        .from('edu_trainings')
        .select('*')
        .in('training_id', trainingIds)
        .eq('active', true);
      
      if (trainingsError) throw trainingsError;
      
      return trainings as EduTraining[];
    },
    enabled: indicatorCodes.length > 0,
  });
}

// Get training stats
export function useEduTrainingStats() {
  return useQuery({
    queryKey: ['edu-training-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('type, pillar')
        .eq('active', true);
      
      if (error) throw error;
      
      const stats = {
        totalCourses: 0,
        totalLives: 0,
        byPillar: {
          RA: { courses: 0, lives: 0 },
          OE: { courses: 0, lives: 0 },
          AO: { courses: 0, lives: 0 },
        } as Record<string, { courses: number; lives: number }>,
      };
      
      data?.forEach(item => {
        if (item.type === 'course') {
          stats.totalCourses++;
          if (stats.byPillar[item.pillar]) {
            stats.byPillar[item.pillar].courses++;
          }
        } else {
          stats.totalLives++;
          if (stats.byPillar[item.pillar]) {
            stats.byPillar[item.pillar].lives++;
          }
        }
      });
      
      return stats;
    },
  });
}

// Get indicator mapping stats
export function useIndicatorMappingStats() {
  return useQuery({
    queryKey: ['indicator-mapping-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_indicator_training_map')
        .select('indicator_code, pillar');
      
      if (error) throw error;
      
      const uniqueIndicators = new Set(data?.map(d => d.indicator_code));
      const byPillar = data?.reduce((acc, item) => {
        acc[item.pillar] = (acc[item.pillar] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      return {
        totalMappings: data?.length || 0,
        uniqueIndicators: uniqueIndicators.size,
        byPillar,
      };
    },
  });
}
