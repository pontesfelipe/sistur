import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AssessmentUnit {
  id: string;
  assessment_id: string;
  destination_id: string;
  enterprise_profile_id: string | null;
  unit_name: string | null;
  is_primary: boolean;
  status: 'pending' | 'data_ready' | 'calculated';
  created_at: string;
  updated_at: string;
  destinations?: { id: string; name: string; uf: string | null; ibge_code: string | null } | null;
}

export function useAssessmentUnits(assessmentId: string | null | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['assessment-units', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [] as AssessmentUnit[];
      const { data, error } = await supabase
        .from('assessment_units')
        .select('*, destinations(id, name, uf, ibge_code)')
        .eq('assessment_id', assessmentId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AssessmentUnit[];
    },
    enabled: !!assessmentId,
  });

  const addUnit = useMutation({
    mutationFn: async (input: { destination_id: string; unit_name?: string | null; is_primary?: boolean }) => {
      if (!assessmentId) throw new Error('Diagnóstico não encontrado');
      if (input.is_primary) {
        await supabase
          .from('assessment_units')
          .update({ is_primary: false })
          .eq('assessment_id', assessmentId);
      }
      const { data, error } = await supabase
        .from('assessment_units')
        .insert({
          assessment_id: assessmentId,
          destination_id: input.destination_id,
          unit_name: input.unit_name ?? null,
          is_primary: !!input.is_primary,
        })
        .select('*, destinations(id, name, uf, ibge_code)')
        .single();
      if (error) throw error;
      return data as unknown as AssessmentUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-units', assessmentId] });
      toast.success('Unidade adicionada');
    },
    onError: (e: any) => {
      const msg = e?.message?.includes('unique')
        ? 'Este município já está cadastrado como unidade deste diagnóstico.'
        : 'Erro ao adicionar unidade';
      toast.error(msg);
    },
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AssessmentUnit> & { id: string }) => {
      if (patch.is_primary && assessmentId) {
        await supabase
          .from('assessment_units')
          .update({ is_primary: false })
          .eq('assessment_id', assessmentId)
          .neq('id', id);
      }
      const { data, error } = await supabase
        .from('assessment_units')
        .update(patch as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AssessmentUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-units', assessmentId] });
    },
    onError: () => toast.error('Erro ao atualizar unidade'),
  });

  const removeUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assessment_units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-units', assessmentId] });
      toast.success('Unidade removida');
    },
    onError: () => toast.error('Erro ao remover unidade'),
  });

  return {
    units: query.data ?? [],
    isLoading: query.isLoading,
    addUnit,
    updateUnit,
    removeUnit,
  };
}