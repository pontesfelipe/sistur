import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Reward {
  id: string;
  type: 'avatar' | 'theme';
  code: string;
  name: string;
  description: string | null;
  value: string;
  unlock_level: number;
  icon: string | null;
  active: boolean;
}

export function useRewards() {
  return useQuery({
    queryKey: ['edu-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_rewards')
        .select('*')
        .eq('active', true)
        .order('unlock_level', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reward[];
    },
  });
}

export function useEquipReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: 'avatar' | 'theme'; code: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const field = input.type === 'avatar' ? 'equipped_avatar' : 'equipped_theme';
      const { error } = await supabase
        .from('edu_user_xp')
        .upsert({ user_id: u.user.id, [field]: input.code }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['my-xp'] });
      toast.success(vars.type === 'avatar' ? 'Avatar equipado' : 'Tema aplicado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Não foi possível equipar'),
  });
}