import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAssessments() {
  const queryClient = useQueryClient();

  const { data: assessments, isLoading, error } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*, destinations(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createAssessment = useMutation({
    mutationFn: async (assessment: {
      title: string;
      destination_id: string;
      period_start?: string | null;
      period_end?: string | null;
      status?: 'DRAFT' | 'DATA_READY' | 'CALCULATED';
      visibility?: 'organization' | 'personal' | 'demo';
      tier?: 'COMPLETE' | 'MEDIUM' | 'SMALL';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Determine which org_id to use based on visibility
      const targetOrgId = assessment.visibility === 'demo' && profile.viewing_demo_org_id
        ? profile.viewing_demo_org_id
        : profile.org_id;
      
      // For demo visibility, store as 'organization' in the DB
      const dbVisibility = assessment.visibility === 'demo' ? 'organization' : (assessment.visibility || 'organization');

      const { data, error } = await supabase
        .from('assessments')
        .insert({
          title: assessment.title,
          destination_id: assessment.destination_id,
          period_start: assessment.period_start || null,
          period_end: assessment.period_end || null,
          status: assessment.status || 'DRAFT',
          org_id: targetOrgId,
          visibility: dbVisibility,
          creator_user_id: user.id,
          tier: assessment.tier || 'COMPLETE',
        })
        .select('*, destinations(name)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Diagnóstico criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating assessment:', error);
      toast.error('Erro ao criar diagnóstico. Tente novamente.');
    },
  });

  const updateAssessment = useMutation({
    mutationFn: async ({ id, ...assessment }: {
      id: string;
      title?: string;
      destination_id?: string;
      period_start?: string | null;
      period_end?: string | null;
      status?: 'DRAFT' | 'DATA_READY' | 'CALCULATED';
    }) => {
      const { data, error } = await supabase
        .from('assessments')
        .update(assessment)
        .eq('id', id)
        .select('*, destinations(name)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Diagnóstico atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating assessment:', error);
      toast.error('Erro ao atualizar diagnóstico. Tente novamente.');
    },
  });

  const deleteAssessment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Diagnóstico excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting assessment:', error);
      toast.error('Erro ao excluir diagnóstico. Tente novamente.');
    },
  });

  return {
    assessments,
    isLoading,
    error,
    createAssessment,
    updateAssessment,
    deleteAssessment,
  };
}
