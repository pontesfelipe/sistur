import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TrainingAccess {
  id: string;
  training_id: string;
  access_type: 'public' | 'org' | 'user';
  org_id: string | null;
  user_id: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface TrainingAccessWithDetails extends TrainingAccess {
  org_name?: string;
  user_email?: string;
  user_name?: string;
}

export function useTrainingAccess(trainingId?: string) {
  return useQuery({
    queryKey: ['training-access', trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      
      const { data, error } = await supabase
        .from('edu_training_access')
        .select('*')
        .eq('training_id', trainingId)
        .order('access_type', { ascending: true });
      
      if (error) throw error;
      
      // Enrich with org names and user info
      const enrichedData: TrainingAccessWithDetails[] = [];
      
      for (const access of (data || [])) {
        const enriched: TrainingAccessWithDetails = { 
          ...access as unknown as TrainingAccess 
        };
        
        if (access.org_id) {
          const { data: org } = await supabase
            .from('orgs')
            .select('name')
            .eq('id', access.org_id)
            .single();
          enriched.org_name = org?.name;
        }
        
        if (access.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', access.user_id)
            .single();
          enriched.user_name = profile?.full_name || undefined;
        }
        
        enrichedData.push(enriched);
      }
      
      return enrichedData;
    },
    enabled: !!trainingId,
  });
}

export function useTrainingAccessMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const grantPublicAccess = useMutation({
    mutationFn: async (trainingId: string) => {
      // First remove any existing public access
      await supabase
        .from('edu_training_access')
        .delete()
        .eq('training_id', trainingId)
        .eq('access_type', 'public');
      
      const { data, error } = await supabase
        .from('edu_training_access')
        .insert({
          training_id: trainingId,
          access_type: 'public',
          granted_by: user?.id,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, trainingId) => {
      queryClient.invalidateQueries({ queryKey: ['training-access', trainingId] });
      toast.success('Acesso público liberado');
    },
    onError: (error) => {
      toast.error(`Erro ao liberar acesso: ${error.message}`);
    },
  });

  const grantOrgAccess = useMutation({
    mutationFn: async ({ trainingId, orgId, expiresAt }: { trainingId: string; orgId: string; expiresAt?: string }) => {
      const { data, error } = await supabase
        .from('edu_training_access')
        .insert({
          training_id: trainingId,
          access_type: 'org',
          org_id: orgId,
          granted_by: user?.id,
          expires_at: expiresAt || null,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { trainingId }) => {
      queryClient.invalidateQueries({ queryKey: ['training-access', trainingId] });
      toast.success('Acesso liberado para organização');
    },
    onError: (error) => {
      toast.error(`Erro ao liberar acesso: ${error.message}`);
    },
  });

  const grantUserAccess = useMutation({
    mutationFn: async ({ trainingId, userId, expiresAt }: { trainingId: string; userId: string; expiresAt?: string }) => {
      const { data, error } = await supabase
        .from('edu_training_access')
        .insert({
          training_id: trainingId,
          access_type: 'user',
          user_id: userId,
          granted_by: user?.id,
          expires_at: expiresAt || null,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { trainingId }) => {
      queryClient.invalidateQueries({ queryKey: ['training-access', trainingId] });
      toast.success('Acesso liberado para usuário');
    },
    onError: (error) => {
      toast.error(`Erro ao liberar acesso: ${error.message}`);
    },
  });

  const revokeAccess = useMutation({
    mutationFn: async ({ accessId, trainingId }: { accessId: string; trainingId: string }) => {
      const { error } = await supabase
        .from('edu_training_access')
        .delete()
        .eq('id', accessId);
      
      if (error) throw error;
      return { accessId, trainingId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['training-access', result.trainingId] });
      toast.success('Acesso revogado');
    },
    onError: (error) => {
      toast.error(`Erro ao revogar acesso: ${error.message}`);
    },
  });

  const removePublicAccess = useMutation({
    mutationFn: async (trainingId: string) => {
      const { error } = await supabase
        .from('edu_training_access')
        .delete()
        .eq('training_id', trainingId)
        .eq('access_type', 'public');
      
      if (error) throw error;
      return trainingId;
    },
    onSuccess: (trainingId) => {
      queryClient.invalidateQueries({ queryKey: ['training-access', trainingId] });
      toast.success('Acesso público removido');
    },
    onError: (error) => {
      toast.error(`Erro ao remover acesso: ${error.message}`);
    },
  });

  return {
    grantPublicAccess,
    grantOrgAccess,
    grantUserAccess,
    revokeAccess,
    removePublicAccess,
  };
}

export function useOrgs() {
  return useQuery({
    queryKey: ['orgs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orgs')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUsersForAccess() {
  return useQuery({
    queryKey: ['users-for-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(p => ({ ...p, email: undefined })) as { user_id: string; full_name: string | null; email?: string }[];
    },
  });
}
