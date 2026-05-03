import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak?: number;
  longest_streak?: number;
  last_activity_date?: string | null;
}

export interface XPEvent {
  id: string;
  user_id: string;
  source: 'course_completed' | 'step_completed' | 'exam_passed' | 'badge_earned' | 'manual';
  reference_id: string | null;
  points: number;
  description: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  criteria: string | null;
  xp_reward: number;
  active: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export const xpForLevel = (level: number) => Math.round(100 * Math.pow(level, 1.5));
export const levelFromXP = (xp: number) => {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
};

export function useMyXP() {
  return useQuery({
    queryKey: ['my-xp'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from('edu_user_xp')
        .select('*')
        .eq('user_id', u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserXP | null;
    },
  });
}

export function useMyXPEvents() {
  return useQuery({
    queryKey: ['my-xp-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_xp_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as XPEvent[];
    },
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ['edu-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_badges')
        .select('*')
        .eq('active', true)
        .order('xp_reward', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Badge[];
    },
  });
}

export function useMyBadges() {
  return useQuery({
    queryKey: ['my-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_user_badges')
        .select('*, badge:edu_badges(*)')
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserBadge[];
    },
  });
}

export function useAwardXP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      source: XPEvent['source'];
      points: number;
      reference_id?: string;
      description?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const uid = u.user.id;

      const { error: evErr } = await supabase.from('edu_xp_events').insert({
        user_id: uid,
        source: input.source,
        points: input.points,
        reference_id: input.reference_id ?? null,
        description: input.description ?? null,
      });
      if (evErr) throw evErr;

      const { data: cur } = await supabase
        .from('edu_user_xp')
        .select('total_xp')
        .eq('user_id', uid)
        .maybeSingle();
      const newTotal = (cur?.total_xp ?? 0) + input.points;
      const newLevel = levelFromXP(newTotal);

      const { error: upErr } = await supabase
        .from('edu_user_xp')
        .upsert({ user_id: uid, total_xp: newTotal, level: newLevel }, { onConflict: 'user_id' });
      if (upErr) throw upErr;

      return { newTotal, newLevel };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-xp'] });
      qc.invalidateQueries({ queryKey: ['my-xp-events'] });
      toast.success(`+${res.newTotal} XP — Nível ${res.newLevel}`);
    },
  });
}

export function useClaimBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (badgeCode: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { data: badge, error: bErr } = await supabase
        .from('edu_badges')
        .select('*')
        .eq('code', badgeCode)
        .maybeSingle();
      if (bErr) throw bErr;
      if (!badge) throw new Error('Badge não encontrada');
      const { error } = await supabase
        .from('edu_user_badges')
        .insert({ user_id: u.user.id, badge_id: badge.id });
      if (error && !error.message.includes('duplicate')) throw error;
      return badge as Badge;
    },
    onSuccess: (badge) => {
      qc.invalidateQueries({ queryKey: ['my-badges'] });
      toast.success(`🏆 Badge conquistada: ${badge.title}`);
    },
  });
}