import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useOrgReferralCodes() {
  const { user } = useAuth();

  const { data: codes, isLoading } = useQuery({
    queryKey: ['org-referral-codes', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from('org_referral_codes')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const generateCode = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.org_id) throw new Error('Sem organização');

      const code = `ORG${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data, error } = await supabase
        .from('org_referral_codes')
        .insert({
          org_id: profile.org_id,
          created_by: user!.id,
          code,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-referral-codes'] });
      toast.success('Código de convite gerado!');
    },
    onError: () => toast.error('Erro ao gerar código. Verifique se você tem permissão.'),
  });

  const deactivateCode = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from('org_referral_codes')
        .update({ is_active: false })
        .eq('id', codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-referral-codes'] });
      toast.success('Código desativado');
    },
    onError: () => toast.error('Erro ao desativar código'),
  });

  return { codes, isLoading, generateCode, deactivateCode };
}

export function useLinkUserToOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('link_user_to_org_by_code', {
        p_code: code,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (linked) => {
      if (linked) {
        toast.success('Você foi vinculado à organização com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        toast.info('Código inválido, já expirado ou você já pertence a essa organização.');
      }
    },
    onError: () => toast.error('Erro ao vincular código da organização'),
  });
}
