import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CurriculumLevel {
  level: number;
  name: string;
  description: string | null;
  target_audience: string | null;
  ods_alignment: string[] | null;
}

export const LEVEL_COLORS: Record<number, { badge: string; text: string }> = {
  1: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', text: 'text-emerald-600 dark:text-emerald-400' },
  2: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'text-blue-600 dark:text-blue-400' },
  3: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', text: 'text-amber-600 dark:text-amber-400' },
  4: { badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', text: 'text-purple-600 dark:text-purple-400' },
};

export const LEVEL_SHORT_NAMES: Record<number, string> = {
  1: 'Fundamentos',
  2: 'Técnico',
  3: 'Gestão',
  4: 'Liderança',
};

export function useCurriculumLevels() {
  return useQuery({
    queryKey: ['curriculum-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .order('level', { ascending: true });
      if (error) throw error;
      return data as CurriculumLevel[];
    },
  });
}

/**
 * Returns the highest curriculum level the user has completed at least 1 training in.
 * Used to enforce prerequisite logic: level N requires ≥1 completion at level N-1.
 */
export function useUserCurriculumProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-curriculum-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return { completedLevels: new Set<number>(), maxUnlockedLevel: 1 };

      // Get completed training IDs from edu_progress
      const { data: progress, error: progressError } = await supabase
        .from('edu_progress')
        .select('training_id')
        .eq('user_id', user.id)
        .eq('progress_percent', 100);

      if (progressError) throw progressError;

      if (!progress?.length) {
        return { completedLevels: new Set<number>(), maxUnlockedLevel: 1 };
      }

      const completedIds = progress.map(p => p.training_id);

      // Get the curriculum levels of those completed trainings
      const { data: trainings, error: trainingsError } = await supabase
        .from('edu_trainings')
        .select('training_id, curriculum_level')
        .in('training_id', completedIds)
        .not('curriculum_level', 'is', null);

      if (trainingsError) throw trainingsError;

      const completedLevels = new Set<number>();
      trainings?.forEach(t => {
        if (t.curriculum_level) completedLevels.add(t.curriculum_level);
      });

      // Determine max unlocked level
      let maxUnlockedLevel = 1;
      for (let lvl = 1; lvl <= 4; lvl++) {
        if (completedLevels.has(lvl)) {
          maxUnlockedLevel = Math.min(lvl + 1, 4);
        } else {
          break;
        }
      }

      return { completedLevels, maxUnlockedLevel };
    },
    enabled: !!user?.id,
  });
}
