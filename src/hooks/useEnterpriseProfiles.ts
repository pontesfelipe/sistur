import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnterpriseProfile {
  id: string;
  destination_id: string;
  org_id: string;
  
  // Tipo e Porte
  property_type: string;
  star_rating: number | null;
  room_count: number | null;
  suite_count: number | null;
  total_capacity: number | null;
  
  // Equipe e Operação
  employee_count: number | null;
  years_in_operation: number | null;
  seasonality: string | null;
  peak_months: string[] | null;
  
  // Mercado e Público
  target_market: string[] | null;
  average_occupancy_rate: number | null;
  average_daily_rate: number | null;
  primary_source_markets: string[] | null;
  
  // Certificações
  certifications: string[] | null;
  sustainability_initiatives: string[] | null;
  accessibility_features: string[] | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EnterpriseProfileInput = Omit<EnterpriseProfile, 'id' | 'created_at' | 'updated_at'>;

export function useEnterpriseProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['enterprise-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprise_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EnterpriseProfile[];
    }
  });

  const upsertProfile = useMutation({
    mutationFn: async (profile: Partial<EnterpriseProfileInput> & { destination_id: string; org_id: string }) => {
      const { data, error } = await supabase
        .from('enterprise_profiles')
        .upsert(profile, { onConflict: 'destination_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-profiles'] });
      toast.success('Perfil do empreendimento salvo');
    },
    onError: (error) => {
      console.error('Error saving enterprise profile:', error);
      toast.error('Erro ao salvar perfil do empreendimento');
    }
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enterprise_profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-profiles'] });
      toast.success('Perfil removido');
    },
    onError: (error) => {
      console.error('Error deleting enterprise profile:', error);
      toast.error('Erro ao remover perfil');
    }
  });

  return {
    profiles,
    isLoading,
    upsertProfile,
    deleteProfile,
    getProfileByDestination: (destinationId: string) => 
      profiles?.find(p => p.destination_id === destinationId) || null
  };
}

export function useEnterpriseProfile(destinationId: string | null) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['enterprise-profile', destinationId],
    queryFn: async () => {
      if (!destinationId) return null;
      
      const { data, error } = await supabase
        .from('enterprise_profiles')
        .select('*')
        .eq('destination_id', destinationId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EnterpriseProfile | null;
    },
    enabled: !!destinationId
  });

  return { profile, isLoading };
}
