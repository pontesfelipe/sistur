import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';

export interface EnterpriseIndicatorCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  pillar: 'RA' | 'OE' | 'AO';
  sort_order: number;
  created_at: string;
}

export interface EnterpriseIndicator {
  id: string;
  code: string;
  name: string;
  description: string | null;
  pillar: 'RA' | 'OE' | 'AO';
  category_id: string;
  category?: EnterpriseIndicatorCategory;
  unit: string;
  weight: number;
  minimum_tier: 'SMALL' | 'MEDIUM' | 'COMPLETE';
  collection_frequency: string;
  benchmark_min: number | null;
  benchmark_max: number | null;
  benchmark_target: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseIndicatorValue {
  id: string;
  indicator_id: string;
  assessment_id: string;
  org_id: string;
  value: number | null;
  value_text: string | null;
  reference_date: string | null;
  source: string | null;
  notes: string | null;
  validated: boolean;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
  indicator?: EnterpriseIndicator;
}

export function useEnterpriseCategories() {
  return useQuery({
    queryKey: ['enterprise-indicator-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprise_indicator_categories')
        .select('*')
        .order('pillar')
        .order('sort_order');
      
      if (error) throw error;
      return data as EnterpriseIndicatorCategory[];
    },
  });
}

export function useEnterpriseIndicators(tier?: 'SMALL' | 'MEDIUM' | 'COMPLETE') {
  return useQuery({
    queryKey: ['enterprise-indicators', tier],
    queryFn: async () => {
      let query = supabase
        .from('enterprise_indicators')
        .select(`
          *,
          category:enterprise_indicator_categories(*)
        `)
        .eq('is_active', true)
        .order('pillar')
        .order('code');
      
      // Filter by tier if provided
      if (tier) {
        if (tier === 'SMALL') {
          query = query.eq('minimum_tier', 'SMALL');
        } else if (tier === 'MEDIUM') {
          query = query.in('minimum_tier', ['SMALL', 'MEDIUM']);
        }
        // COMPLETE includes all
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as EnterpriseIndicator[];
    },
  });
}

export function useEnterpriseIndicatorsByPillar(tier?: 'SMALL' | 'MEDIUM' | 'COMPLETE') {
  const { data: indicators, ...rest } = useEnterpriseIndicators(tier);
  
  const groupedByPillar = indicators?.reduce((acc, ind) => {
    if (!acc[ind.pillar]) {
      acc[ind.pillar] = [];
    }
    acc[ind.pillar].push(ind);
    return acc;
  }, {} as Record<string, EnterpriseIndicator[]>);
  
  return {
    data: groupedByPillar,
    indicators,
    ...rest,
  };
}

export function useEnterpriseIndicatorValues(assessmentId?: string) {
  return useQuery({
    queryKey: ['enterprise-indicator-values', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      // First get the values
      const { data: values, error: valuesError } = await supabase
        .from('enterprise_indicator_values')
        .select('*')
        .eq('assessment_id', assessmentId);
      
      if (valuesError) throw valuesError;
      
      if (!values || values.length === 0) return [];
      
      // Then get the indicators for these values
      const indicatorIds = values.map(v => v.indicator_id);
      const { data: indicators, error: indicatorsError } = await supabase
        .from('enterprise_indicators')
        .select(`
          *,
          category:enterprise_indicator_categories(*)
        `)
        .in('id', indicatorIds);
      
      if (indicatorsError) throw indicatorsError;
      
      // Combine them
      const indicatorMap = new Map(indicators?.map(i => [i.id, i]) || []);
      
      return values.map(v => ({
        ...v,
        indicator: indicatorMap.get(v.indicator_id),
      })) as EnterpriseIndicatorValue[];
    },
    enabled: !!assessmentId,
  });
}

export function useSaveEnterpriseIndicatorValue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      indicatorId: string;
      assessmentId: string;
      orgId: string;
      value: number | null;
      valueText?: string | null;
      referenceDate?: string | null;
      source?: string | null;
      notes?: string | null;
    }) => {
      const { indicatorId, assessmentId, orgId, value, valueText, referenceDate, source, notes } = params;
      
      // Upsert - insert or update if exists
      const { data, error } = await supabase
        .from('enterprise_indicator_values')
        .upsert({
          indicator_id: indicatorId,
          assessment_id: assessmentId,
          org_id: orgId,
          value,
          value_text: valueText,
          reference_date: referenceDate,
          source,
          notes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'indicator_id,assessment_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-indicator-values', variables.assessmentId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar valor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useValidateEnterpriseIndicatorValue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      valueId: string;
      validated: boolean;
      assessmentId: string;
    }) => {
      const { valueId, validated } = params;
      
      const { data, error } = await supabase
        .from('enterprise_indicator_values')
        .update({
          validated,
          validated_at: validated ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', valueId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-indicator-values', variables.assessmentId] });
    },
  });
}

export function useBulkSaveEnterpriseIndicatorValues() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      assessmentId: string;
      orgId: string;
      values: Array<{
        indicatorId: string;
        value: number | null;
        valueText?: string | null;
        referenceDate?: string | null;
        source?: string | null;
        notes?: string | null;
      }>;
    }) => {
      const { assessmentId, orgId, values } = params;
      
      const records = values.map(v => ({
        indicator_id: v.indicatorId,
        assessment_id: assessmentId,
        org_id: orgId,
        value: v.value,
        value_text: v.valueText,
        reference_date: v.referenceDate,
        source: v.source,
        notes: v.notes,
        updated_at: new Date().toISOString(),
      }));
      
      // Do individual upserts (Supabase doesn't have batch upsert with conflict handling)
      const results: unknown[] = [];
      for (const record of records) {
        const { data, error: insertError } = await supabase
          .from('enterprise_indicator_values')
          .upsert(record, {
            onConflict: 'indicator_id,assessment_id',
          })
          .select();
        if (insertError) throw insertError;
        if (data) results.push(...data);
      }
      
      return { count: results.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-indicator-values', variables.assessmentId] });
      toast({
        title: 'Valores salvos',
        description: `${result.count} indicadores salvos com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar valores',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
