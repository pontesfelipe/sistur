import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export type StakeholderType = 
  | 'PUBLIC_DECISION_MAKER' 
  | 'INVESTOR' 
  | 'ENTREPRENEUR' 
  | 'COMMUNITY_MEMBER' 
  | 'TRAVELER';

export interface StakeholderProfile {
  id: string;
  user_id: string;
  org_id: string;
  stakeholder_type: StakeholderType;
  profile_data: Json;
  created_at: string;
  updated_at: string;
}

export const STAKEHOLDER_LABELS: Record<StakeholderType, string> = {
  PUBLIC_DECISION_MAKER: 'Gestor Público',
  INVESTOR: 'Investidor',
  ENTREPRENEUR: 'Empreendedor',
  COMMUNITY_MEMBER: 'Membro da Comunidade',
  TRAVELER: 'Viajante',
};

async function getUserOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', userId)
    .single();
  return data?.org_id ?? null;
}

export function useStakeholderProfiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stakeholderProfiles, isLoading } = useQuery({
    queryKey: ['stakeholder-profiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('stakeholder_profiles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as StakeholderProfile[];
    },
    enabled: !!user?.id,
  });

  const createProfile = useMutation({
    mutationFn: async (stakeholderType: StakeholderType) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const orgId = await getUserOrgId(user.id);
      if (!orgId) {
        throw new Error('Perfil não encontrado');
      }

      const { data, error } = await supabase
        .from('stakeholder_profiles')
        .insert({
          user_id: user.id,
          org_id: orgId,
          stakeholder_type: stakeholderType,
          profile_data: {} as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholder-profiles'] });
      toast({
        title: 'Perfil Criado',
        description: 'Seu perfil de stakeholder foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({
      id,
      profileData,
    }: {
      id: string;
      profileData: Json;
    }) => {
      const { data, error } = await supabase
        .from('stakeholder_profiles')
        .update({ profile_data: profileData })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholder-profiles'] });
      toast({
        title: 'Perfil Atualizado',
        description: 'Seu perfil foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const hasStakeholderType = (type: StakeholderType) =>
    stakeholderProfiles?.some((p) => p.stakeholder_type === type) ?? false;

  return {
    stakeholderProfiles,
    isLoading,
    createProfile: createProfile.mutate,
    updateProfile: updateProfile.mutate,
    hasStakeholderType,
    isCreating: createProfile.isPending,
  };
}
