import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Indicator = Database['public']['Tables']['indicators']['Row'];
type IndicatorInsert = Database['public']['Tables']['indicators']['Insert'];

export function useIndicators() {
  const queryClient = useQueryClient();

  const { data: indicators = [], isLoading, error } = useQuery({
    queryKey: ['indicators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .order('pillar', { ascending: true })
        .order('theme', { ascending: true });

      if (error) throw error;
      return data as Indicator[];
    },
  });

  const createIndicator = useMutation({
    mutationFn: async (indicator: Omit<IndicatorInsert, 'org_id'>) => {
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Use effective org_id (supports demo mode)
      const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;

      const { data, error } = await supabase
        .from('indicators')
        .insert({
          ...indicator,
          org_id: effectiveOrgId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicador criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating indicator:', error);
      toast.error('Erro ao criar indicador');
    },
  });

  const updateIndicator = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Indicator> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('indicators')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicador atualizado');
    },
    onError: (error) => {
      console.error('Error updating indicator:', error);
      toast.error('Erro ao atualizar indicador');
    },
  });

  const deleteIndicator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('indicators')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicador excluído');
    },
    onError: (error) => {
      console.error('Error deleting indicator:', error);
      toast.error('Erro ao excluir indicador');
    },
  });

  return {
    indicators,
    isLoading,
    error,
    createIndicator,
    updateIndicator,
    deleteIndicator,
  };
}

export function useIndicatorValues(assessmentId?: string) {
  const queryClient = useQueryClient();

  const { data: values = [], isLoading, error } = useQuery({
    queryKey: ['indicator-values', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];

      const { data, error } = await supabase
        .from('indicator_values')
        .select(`
          *,
          indicator:indicators(*)
        `)
        .eq('assessment_id', assessmentId);

      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId,
  });

  const upsertValue = useMutation({
    mutationFn: async (value: {
      assessment_id: string;
      indicator_id: string;
      value_raw?: number | null;
      value_text?: string | null;
      source?: string | null;
      reference_date?: string | null;
    }) => {
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Use effective org_id (supports demo mode)
      const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;

      // Check if value exists
      const { data: existing } = await supabase
        .from('indicator_values')
        .select('id')
        .eq('assessment_id', value.assessment_id)
        .eq('indicator_id', value.indicator_id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('indicator_values')
          .update({
            value_raw: value.value_raw,
            value_text: value.value_text,
            source: value.source,
            reference_date: value.reference_date,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('indicator_values')
          .insert({
            ...value,
            org_id: effectiveOrgId,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-values', assessmentId] });
    },
    onError: (error) => {
      console.error('Error saving indicator value:', error);
      toast.error('Erro ao salvar valor');
    },
  });

  const bulkUpsertValues = useMutation({
    mutationFn: async (values: Array<{
      assessment_id: string;
      indicator_id: string;
      value_raw?: number | null;
      source?: string | null;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Use effective org_id (supports demo mode)
      const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;

      // Delete existing values for this assessment
      await supabase
        .from('indicator_values')
        .delete()
        .eq('assessment_id', values[0]?.assessment_id);

      // Insert new values
      const { data, error } = await supabase
        .from('indicator_values')
        .insert(values.map(v => ({
          ...v,
          org_id: effectiveOrgId,
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-values'] });
      toast.success('Valores importados com sucesso');
    },
    onError: (error) => {
      console.error('Error bulk importing values:', error);
      toast.error('Erro ao importar valores');
    },
  });

  return {
    values,
    isLoading,
    error,
    upsertValue,
    bulkUpsertValues,
  };
}
