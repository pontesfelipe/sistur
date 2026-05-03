/**
 * SISEDU - Progresso Granular de Treinamentos
 * Rastreamento detalhado de progresso, posição de vídeo e tempo gasto
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { awardXP, XP_VALUES } from '@/lib/awardXP';
import { autoClaimBadge, countCompletedCourses } from '@/lib/autoClaimBadge';

export interface DetailedProgress {
  id: string;
  user_id: string;
  training_id: string;
  module_index: number;
  progress_pct: number;
  video_position_seconds: number;
  last_accessed_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export function useTrainingProgress(trainingId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['edu-detailed-progress', trainingId, user?.id],
    queryFn: async () => {
      if (!trainingId || !user?.id) return [];
      const { data, error } = await supabase
        .from('edu_detailed_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('training_id', trainingId)
        .order('module_index', { ascending: true });
      if (error) throw error;
      return data as DetailedProgress[];
    },
    enabled: !!trainingId && !!user?.id,
  });
}

export function useAllTrainingProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['edu-all-detailed-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('edu_detailed_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false });
      if (error) throw error;
      return data as DetailedProgress[];
    },
    enabled: !!user?.id,
  });
}

export function useRecentlyAccessedTrainings(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['edu-recently-accessed', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('edu_detailed_progress')
        .select('*')
        .eq('user_id', user.id)
        .is('completed_at', null)
        .order('last_accessed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as DetailedProgress[];
    },
    enabled: !!user?.id,
  });
}

export function useProgressMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const upsertProgress = useMutation({
    mutationFn: async (data: {
      training_id: string;
      module_index?: number;
      progress_pct?: number;
      video_position_seconds?: number;
      time_spent_seconds?: number;
      completed_at?: string | null;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('edu_detailed_progress')
        .upsert({
          user_id: user.id,
          training_id: data.training_id,
          module_index: data.module_index ?? 0,
          progress_pct: data.progress_pct ?? 0,
          video_position_seconds: data.video_position_seconds ?? 0,
          time_spent_seconds: data.time_spent_seconds ?? 0,
          completed_at: data.completed_at ?? null,
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,training_id,module_index',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['edu-detailed-progress', vars.training_id] });
      queryClient.invalidateQueries({ queryKey: ['edu-all-detailed-progress'] });
      queryClient.invalidateQueries({ queryKey: ['edu-recently-accessed'] });
      queryClient.invalidateQueries({ queryKey: ['edu-user-xp'] });
      queryClient.invalidateQueries({ queryKey: ['my-xp'] });

      // Gamificação: XP quando o módulo é marcado como concluído pela primeira vez
      if (vars.completed_at) {
        awardXP({
          source: 'course_completed',
          points: XP_VALUES.COURSE_COMPLETED,
          reference_id: vars.training_id,
          description: 'Módulo de treinamento concluído',
        });
        // Auto-claim: primeira conclusão concede a badge "first_course"
        countCompletedCourses().then((n) => {
          if (n >= 1) autoClaimBadge('first_course');
        });
      }
    },
  });

  const saveVideoPosition = useMutation({
    mutationFn: async ({ trainingId, moduleIndex, positionSeconds }: {
      trainingId: string;
      moduleIndex: number;
      positionSeconds: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('edu_detailed_progress')
        .upsert({
          user_id: user.id,
          training_id: trainingId,
          module_index: moduleIndex,
          video_position_seconds: positionSeconds,
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,training_id,module_index',
        });

      if (error) throw error;
    },
  });

  return { upsertProgress, saveVideoPosition };
}

// Calculate overall training progress from module-level data
export function calculateOverallProgress(progressList: DetailedProgress[], totalModules: number): number {
  if (totalModules === 0) return 0;
  const completedModules = progressList.filter(p => p.completed_at).length;
  return Math.round((completedModules / totalModules) * 100);
}
