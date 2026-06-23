import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Indicator = Database['public']['Tables']['indicators']['Row'];
type IndicatorInsert = Database['public']['Tables']['indicators']['Insert'];
type IndicatorScope = 'territorial' | 'enterprise' | 'both';

interface UseIndicatorsOptions {
  scope?: IndicatorScope | 'all';
  tier?: 'SMALL' | 'MEDIUM' | 'COMPLETE';
  /**
   * Controls whether Mandala da Sustentabilidade no Turismo (MST) indicators are returned.
   * - undefined (default): returns ALL indicators (both core + Mandala) — for catalog views
   * - false: excludes MST indicators — for diagnostics that did NOT opt-in
   * - true: includes MST indicators — for diagnostics that opted-in
   */
  includeMandala?: boolean;
}

export function useIndicators(options: UseIndicatorsOptions = {}) {
  const { scope = 'all', tier, includeMandala } = options;
  const queryClient = useQueryClient();

  const { data: indicators = [], isLoading, error } = useQuery({
    queryKey: ['indicators', scope, tier, includeMandala],
    queryFn: async () => {
      let query = supabase
        .from('indicators')
        .select('*')
        .is('deprecated_at', null)
        .order('pillar', { ascending: true })
        .order('theme', { ascending: true });

      // Filter by scope if specified
      if (scope !== 'all') {
        query = query.or(`indicator_scope.eq.${scope},indicator_scope.eq.both`);
      }

      // Filter by tier if specified
      if (tier) {
        const allowedTiers: ('SMALL' | 'MEDIUM' | 'COMPLETE')[] = tier === 'SMALL' 
          ? ['SMALL'] 
          : tier === 'MEDIUM' 
            ? ['SMALL', 'MEDIUM'] 
            : ['SMALL', 'MEDIUM', 'COMPLETE'];
        query = query.in('minimum_tier', allowedTiers);
      }

      // Filter Mandala extension indicators when explicitly excluded
      if (includeMandala === false) {
        query = query.eq('is_mandala_extension', false);
      }

      const { data, error } = await query;

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

export function useIndicatorValues(assessmentId?: string, unitId?: string | null) {
  const queryClient = useQueryClient();

  const getAssessmentOrgId = async (targetAssessmentId: string, fallbackOrgId: string) => {
    const { data } = await supabase
      .from('assessments')
      .select('org_id')
      .eq('id', targetAssessmentId)
      .maybeSingle();
    return data?.org_id || fallbackOrgId;
  };

  const { data: values = [], isLoading, error } = useQuery({
    queryKey: ['indicator-values', assessmentId, unitId ?? null],
    queryFn: async () => {
      if (!assessmentId) return [];

      let q = supabase
        .from('indicator_values')
        .select(`
          *,
          indicator:indicators(*)
        `)
        .eq('assessment_id', assessmentId);
      if (unitId) q = q.eq('unit_id', unitId);
      else q = q.is('unit_id', null);
      const { data, error } = await q;

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
      is_ignored?: boolean;
      ignore_reason?: string | null;
      unit_id?: string | null;
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

      // Use the assessment owner org for persisted values. In demo mode,
      // reading can use effectiveOrgId, but writing values with the demo org
      // into a real-org assessment breaks RLS visibility on the detail page.
      const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;
      const valueOrgId = await getAssessmentOrgId(value.assessment_id, effectiveOrgId);

      // Check if value exists for this (assessment, indicator, unit) tuple
      const effUnitId = value.unit_id ?? unitId ?? null;
      let existingQ = supabase
        .from('indicator_values')
        .select('id')
        .eq('assessment_id', value.assessment_id)
        .eq('indicator_id', value.indicator_id);
      if (effUnitId) existingQ = existingQ.eq('unit_id', effUnitId);
      else existingQ = existingQ.is('unit_id', null);
      const { data: existing } = await existingQ.maybeSingle();

      if (existing) {
        const updateData: Record<string, any> = {
          value_raw: value.value_raw,
          value_text: value.value_text,
          source: value.source,
          reference_date: value.reference_date,
        };
        if (value.is_ignored !== undefined) {
          updateData.is_ignored = value.is_ignored;
          updateData.ignore_reason = value.ignore_reason ?? null;
        }

        const { data, error } = await supabase
          .from('indicator_values')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertData: Record<string, any> = {
          ...value,
          org_id: valueOrgId,
          unit_id: effUnitId,
        };

        const { data, error } = await supabase
          .from('indicator_values')
          .insert(insertData as any)
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
      unit_id?: string | null;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Persist using the assessment owner org, not the current demo org.
      const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;
      const valueOrgId = await getAssessmentOrgId(values[0]?.assessment_id, effectiveOrgId);

      if (!values || values.length === 0) return [];

      // Multi-unit aware: when any row carries unit_id, use the partial
      // unique index on (assessment_id, indicator_id, unit_id WHERE NOT NULL).
      // Otherwise (single-unit / territorial) fall back to the partial
      // index on (assessment_id, indicator_id WHERE unit_id IS NULL).
      const effUnitId = unitId ?? null;
      const rows = values.map(v => ({
        ...v,
        unit_id: v.unit_id ?? effUnitId,
        org_id: valueOrgId,
      }));
      const hasUnit = rows.some(r => r.unit_id);
      const { data, error } = await supabase
        .from('indicator_values')
        .upsert(rows, {
          onConflict: hasUnit
            ? 'assessment_id,indicator_id,unit_id'
            : 'assessment_id,indicator_id',
        })
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
