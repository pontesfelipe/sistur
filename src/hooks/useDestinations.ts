import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileContext } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export function useDestinations() {
  const queryClient = useQueryClient();
  const { effectiveOrgId, loading: profileLoading } = useProfileContext();

  const { data: destinations, isLoading, error } = useQuery({
    queryKey: ['destinations', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];

      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('org_id', effectiveOrgId)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !profileLoading && !!effectiveOrgId,
  });

  const createDestination = useMutation({
    mutationFn: async (destination: {
      name: string;
      uf: string;
      ibge_code?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      visibility?: 'organization' | 'personal' | 'demo';
    }) => {
      // Get the user's org_id and demo org info
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Perfil não encontrado');

      // Determine which org_id to use based on visibility
      const targetOrgId = destination.visibility === 'demo' && profile.viewing_demo_org_id
        ? profile.viewing_demo_org_id
        : profile.org_id;
      
      // For demo visibility, store as 'organization' in the DB (will be accessible when viewing demo)
      const dbVisibility = destination.visibility === 'demo' ? 'organization' : (destination.visibility || 'organization');

      // Dedupe: primeiro por IBGE (fonte canônica), depois por nome+UF.
      if (destination.ibge_code) {
        const { data: byIbge } = await supabase
          .from('destinations')
          .select('id, name')
          .eq('org_id', targetOrgId)
          .eq('ibge_code', destination.ibge_code)
          .maybeSingle();
        if (byIbge) {
          throw new Error(
            `Destino "${byIbge.name}" já cadastrado (IBGE ${destination.ibge_code}). Selecione-o na lista.`,
          );
        }
      }
      const { data: byName } = await supabase
        .from('destinations')
        .select('id')
        .eq('org_id', targetOrgId)
        .ilike('name', destination.name.trim())
        .eq('uf', destination.uf)
        .maybeSingle();
      if (byName) {
        throw new Error(
          `Já existe um destino "${destination.name}" em ${destination.uf}. Selecione-o na lista.`,
        );
      }

      const { data, error } = await supabase
        .from('destinations')
        .insert({
          name: destination.name,
          uf: destination.uf,
          ibge_code: destination.ibge_code || null,
          latitude: destination.latitude,
          longitude: destination.longitude,
          org_id: targetOrgId,
          visibility: dbVisibility,
          creator_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      toast.success('Destino criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating destination:', error);
      toast.error('Erro ao criar destino. Tente novamente.');
    },
  });

  const updateDestination = useMutation({
    mutationFn: async ({ id, ...destination }: {
      id: string;
      name: string;
      uf: string;
      ibge_code?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }) => {
      // Check for duplicate destination (same name + UF, excluding current)
      const { data: existing } = await supabase
        .from('destinations')
        .select('id')
        .eq('org_id', effectiveOrgId)
        .ilike('name', destination.name.trim())
        .eq('uf', destination.uf)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Já existe um destino "${destination.name}" no estado ${destination.uf}`);
      }

      const { data, error } = await supabase
        .from('destinations')
        .update({
          name: destination.name,
          uf: destination.uf,
          ibge_code: destination.ibge_code || null,
          latitude: destination.latitude,
          longitude: destination.longitude,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      toast.success('Destino atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating destination:', error);
      toast.error('Erro ao atualizar destino. Tente novamente.');
    },
  });

  const deleteDestination = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      toast.success('Destino excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting destination:', error);
      toast.error('Erro ao excluir destino. Tente novamente.');
    },
  });

  return {
    destinations,
    isLoading: profileLoading || isLoading,
    error,
    createDestination,
    updateDestination,
    deleteDestination,
  };
}
