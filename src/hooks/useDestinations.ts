import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDestinations() {
  const queryClient = useQueryClient();

  const { data: destinations, isLoading, error } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const createDestination = useMutation({
    mutationFn: async (destination: {
      name: string;
      uf: string;
      ibge_code?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      visibility?: 'organization' | 'personal';
    }) => {
      // Get the user's org_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Perfil não encontrado');

      // Check for duplicate destination (same name + UF)
      const { data: existing } = await supabase
        .from('destinations')
        .select('id')
        .eq('org_id', profile.org_id)
        .ilike('name', destination.name.trim())
        .eq('uf', destination.uf)
        .maybeSingle();

      if (existing) {
        throw new Error(`Já existe um destino "${destination.name}" no estado ${destination.uf}`);
      }

      const { data, error } = await supabase
        .from('destinations')
        .insert({
          name: destination.name,
          uf: destination.uf,
          ibge_code: destination.ibge_code || null,
          latitude: destination.latitude,
          longitude: destination.longitude,
          org_id: profile.org_id,
          visibility: destination.visibility || 'organization',
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
    isLoading,
    error,
    createDestination,
    updateDestination,
    deleteDestination,
  };
}
