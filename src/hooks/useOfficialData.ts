import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Types based on the document specification
export interface ExternalDataSource {
  id: string;
  code: string;
  name: string;
  description: string | null;
  update_frequency: string;
  trust_level_default: number;
  active: boolean;
}

export interface ExternalIndicatorValue {
  id: string;
  indicator_code: string;
  municipality_ibge_code: string;
  source_code: string;
  raw_value: number | null;
  raw_value_text: string | null;
  reference_year: number | null;
  collected_at: string;
  collection_method: 'AUTOMATIC' | 'BATCH' | 'MANUAL';
  confidence_level: number;
  validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  notes: string | null;
  org_id: string;
}

export interface DiagnosisDataSnapshot {
  id: string;
  assessment_id: string;
  indicator_code: string;
  value_used: number | null;
  value_used_text: string | null;
  source_code: string;
  reference_year: number | null;
  confidence_level: number;
  was_manually_adjusted: boolean;
  org_id: string;
}

// Fetch available data sources
export function useExternalDataSources() {
  return useQuery({
    queryKey: ['external-data-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_data_sources')
        .select('*')
        .eq('active', true)
        .order('code');

      if (error) throw error;
      return data as ExternalDataSource[];
    },
  });
}

// Fetch pre-filled values for a municipality
export function useExternalIndicatorValues(ibgeCode: string | undefined, orgId: string | undefined) {
  return useQuery({
    queryKey: ['external-indicator-values', ibgeCode, orgId],
    queryFn: async () => {
      if (!ibgeCode || !orgId) return [];

      const { data, error } = await supabase
        .from('external_indicator_values')
        .select('*')
        .eq('municipality_ibge_code', ibgeCode)
        .eq('org_id', orgId)
        .order('indicator_code');

      if (error) throw error;
      return data as ExternalIndicatorValue[];
    },
    enabled: !!ibgeCode && !!orgId,
  });
}

// Fetch official data from external sources
export function useFetchOfficialData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ibgeCode, orgId, indicators }: { 
      ibgeCode: string; 
      orgId: string; 
      indicators?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('fetch-official-data', {
        body: { ibge_code: ibgeCode, org_id: orgId, indicators },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['external-indicator-values', variables.ibgeCode, variables.orgId] 
      });
      toast({
        title: 'Dados oficiais carregados',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      console.error('Error fetching official data:', error);
      toast({
        title: 'Erro ao buscar dados oficiais',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Validate (confirm) pre-filled values
export function useValidateIndicatorValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      values, 
      userId 
    }: { 
      values: Array<{ id: string; raw_value?: number | null; notes?: string }>;
      userId: string;
    }) => {
      // Update each value with validation
      const updates = values.map(v => 
        supabase
          .from('external_indicator_values')
          .update({
            raw_value: v.raw_value,
            notes: v.notes,
            validated: true,
            validated_by: userId,
            validated_at: new Date().toISOString(),
          })
          .eq('id', v.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to validate ${errors.length} values`);
      }

      return { validated: values.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-indicator-values'] });
      toast({
        title: 'Dados validados com sucesso',
        description: 'Os dados foram confirmados e estão prontos para o diagnóstico.',
      });
    },
    onError: (error: Error) => {
      console.error('Error validating values:', error);
      toast({
        title: 'Erro ao validar dados',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Create snapshot when freezing diagnosis
export function useCreateDataSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      assessmentId, 
      values,
      orgId,
    }: { 
      assessmentId: string;
      values: ExternalIndicatorValue[];
      orgId: string;
    }) => {
      // Create snapshots from validated values
      const snapshots = values.map(v => ({
        assessment_id: assessmentId,
        indicator_code: v.indicator_code,
        value_used: v.raw_value,
        value_used_text: v.raw_value_text,
        source_code: v.source_code,
        reference_year: v.reference_year,
        confidence_level: v.confidence_level,
        was_manually_adjusted: v.collection_method === 'MANUAL',
        org_id: orgId,
      }));

      const { data, error } = await supabase
        .from('diagnosis_data_snapshots')
        .insert(snapshots)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosis-data-snapshots'] });
    },
    onError: (error: Error) => {
      console.error('Error creating data snapshot:', error);
      toast({
        title: 'Erro ao congelar dados',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch snapshots for an assessment
export function useDiagnosisDataSnapshots(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['diagnosis-data-snapshots', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];

      const { data, error } = await supabase
        .from('diagnosis_data_snapshots')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('indicator_code');

      if (error) throw error;
      return data as DiagnosisDataSnapshot[];
    },
    enabled: !!assessmentId,
  });
}
