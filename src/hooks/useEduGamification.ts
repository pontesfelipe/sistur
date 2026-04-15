/**
 * SISEDU - Gamificação (XP, Badges, Streaks)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_code: string;
  achievement_name: string;
  achievement_description: string | null;
  achievement_icon: string | null;
  xp_earned: number;
  earned_at: string;
}

export interface UserXP {
  id: string;
  user_id: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  level: number;
  updated_at: string;
}

// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_TRAINING: { code: 'first_training', name: 'Primeiro Passo', description: 'Completou seu primeiro treinamento', icon: '🎯', xp: 50 },
  FIRST_CERTIFICATE: { code: 'first_certificate', name: 'Certificado!', description: 'Obteve seu primeiro certificado', icon: '🏆', xp: 100 },
  STREAK_7: { code: 'streak_7', name: 'Constância', description: 'Estudou 7 dias consecutivos', icon: '🔥', xp: 75 },
  STREAK_30: { code: 'streak_30', name: 'Dedicação Total', description: 'Estudou 30 dias consecutivos', icon: '💎', xp: 200 },
  FIVE_TRAININGS: { code: 'five_trainings', name: 'Dedicado', description: 'Completou 5 treinamentos', icon: '⭐', xp: 100 },
  TEN_TRAININGS: { code: 'ten_trainings', name: 'Estudioso', description: 'Completou 10 treinamentos', icon: '🌟', xp: 200 },
  PERFECT_EXAM: { code: 'perfect_exam', name: 'Nota Máxima', description: 'Tirou 100% em um exame', icon: '💯', xp: 150 },
  FIRST_TRACK: { code: 'first_track', name: 'Trilheiro', description: 'Completou uma trilha de aprendizagem', icon: '🗺️', xp: 150 },
  ALL_PILLARS: { code: 'all_pillars', name: 'Multidisciplinar', description: 'Estudou nos 3 pilares (RA, OE, AO)', icon: '🎓', xp: 200 },
  HOUR_10: { code: 'hour_10', name: '10 Horas', description: 'Acumulou 10 horas de estudo', icon: '⏰', xp: 75 },
} as const;

// XP per action
export const XP_VALUES = {
  COMPLETE_MODULE: 10,
  COMPLETE_TRAINING: 25,
  PASS_EXAM: 50,
  COMPLETE_TRACK: 75,
  DAILY_LOGIN: 5,
  RATE_TRAINING: 5,
  WATCH_VIDEO: 3,
} as const;

export function calcLevel(totalXp: number): number {
  // Level formula: level = floor(sqrt(xp / 50)) + 1
  return Math.floor(Math.sqrt(totalXp / 50)) + 1;
}

export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 50;
}

export function useUserXP() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['edu-user-xp', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('edu_user_xp')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserXP | null;
    },
    enabled: !!user?.id,
  });
}

export function useUserAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['edu-user-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('edu_user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!user?.id,
  });
}

export function useGamificationMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addXP = useMutation({
    mutationFn: async (xpAmount: number) => {
      if (!user?.id) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Get current XP record
      const { data: current } = await supabase
        .from('edu_user_xp')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (current) {
        const lastDate = current.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = current.current_streak;
        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else if (lastDate !== today) {
          newStreak = 1;
        }

        const newTotal = (current.total_xp || 0) + xpAmount;
        const newLevel = calcLevel(newTotal);

        const { error } = await supabase
          .from('edu_user_xp')
          .update({
            total_xp: newTotal,
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, current.longest_streak || 0),
            last_activity_date: today,
            level: newLevel,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
        return { total_xp: newTotal, level: newLevel, streak: newStreak };
      } else {
        const newLevel = calcLevel(xpAmount);
        const { error } = await supabase
          .from('edu_user_xp')
          .insert({
            user_id: user.id,
            total_xp: xpAmount,
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: today,
            level: newLevel,
          });

        if (error) throw error;
        return { total_xp: xpAmount, level: newLevel, streak: 1 };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-user-xp'] });
    },
  });

  const awardAchievement = useMutation({
    mutationFn: async (achievementDef: { code: string; name: string; description: string; icon: string; xp: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('edu_user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('achievement_code', achievementDef.code)
        .maybeSingle();

      if (existing) return null; // Already has this achievement

      const { data, error } = await supabase
        .from('edu_user_achievements')
        .insert({
          user_id: user.id,
          achievement_code: achievementDef.code,
          achievement_name: achievementDef.name,
          achievement_description: achievementDef.description,
          achievement_icon: achievementDef.icon,
          xp_earned: achievementDef.xp,
        })
        .select()
        .single();

      if (error) throw error;

      // Also add the XP
      await addXP.mutateAsync(achievementDef.xp);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['edu-user-achievements'] });
      if (data) {
        toast.success(`🏅 Conquista desbloqueada: ${data.achievement_name}!`);
      }
    },
  });

  return { addXP, awardAchievement };
}
