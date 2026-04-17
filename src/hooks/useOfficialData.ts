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

// Bridge Mapa do Turismo data into external_indicator_values
async function bridgeMapaTurismoData(ibgeCode: string, orgId: string) {
  let upserted = 0;
  let year = new Date().getFullYear();
  let visitNac = 0;
  let visitInt = 0;
  let categoria: string | null = null;

  // Try mapa_turismo_municipios first (raw ingestion table)
  const { data: mapaRow } = await supabase
    .from('mapa_turismo_municipios')
    .select('categoria, raw_data, ano_referencia')
    .eq('ibge_code', ibgeCode)
    .order('ano_referencia', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mapaRow) {
    const rawData = (mapaRow.raw_data || {}) as Record<string, any>;
    year = mapaRow.ano_referencia || year;
    visitNac = parseFloat(rawData.qt_visita_nacional) || 0;
    visitInt = parseFloat(rawData.qt_visita_internacional) || 0;
    categoria = mapaRow.categoria;
  }

  // Fallback: read from existing external_indicator_values (igma_visitantes_*)
  if (visitNac === 0 && visitInt === 0) {
    const { data: existing } = await supabase
      .from('external_indicator_values')
      .select('indicator_code, raw_value, reference_year')
      .eq('municipality_ibge_code', ibgeCode)
      .eq('org_id', orgId)
      .in('indicator_code', ['igma_visitantes_nacionais', 'igma_visitantes_internacionais']);

    if (existing && existing.length > 0) {
      for (const row of existing) {
        if (row.indicator_code === 'igma_visitantes_nacionais') visitNac = Number(row.raw_value) || 0;
        if (row.indicator_code === 'igma_visitantes_internacionais') visitInt = Number(row.raw_value) || 0;
        if (row.reference_year) year = row.reference_year;
      }
    }
  }

  // 1. Categoria no Mapa do Turismo → igma_categoria_mapa_turismo
  if (categoria) {
    const categoriaMap: Record<string, number> = { 'A': 3, 'B': 2, 'C': 1 };
    const categoriaValue = categoriaMap[categoria] ?? null;
    if (categoriaValue !== null) {
      const { error: e1 } = await supabase
        .from('external_indicator_values')
        .upsert({
          indicator_code: 'igma_categoria_mapa_turismo',
          municipality_ibge_code: ibgeCode,
          source_code: 'MAPA_TURISMO',
          raw_value: categoriaValue,
          raw_value_text: categoria,
          reference_year: year,
          collection_method: 'BATCH' as const,
          confidence_level: 5,
          validated: false,
          org_id: orgId,
          notes: `Mapa do Turismo ${year}. Categoria: ${categoria}.`,
        }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
      if (!e1) upserted++;
    }
  }

  // 2. Fluxo Turístico Anual → AO001 (visitantes nacionais + internacionais)
  const totalFlow = visitNac + visitInt;
  if (totalFlow > 0) {
    const { error: e2 } = await supabase
      .from('external_indicator_values')
      .upsert({
        indicator_code: 'AO001',
        municipality_ibge_code: ibgeCode,
        source_code: 'MAPA_TURISMO',
        raw_value: totalFlow,
        reference_year: year,
        collection_method: 'BATCH' as const,
        confidence_level: 4,
        validated: false,
        org_id: orgId,
        notes: `Mapa do Turismo ${year}. Visitantes nacionais: ${visitNac.toLocaleString('pt-BR')}, internacionais: ${visitInt.toLocaleString('pt-BR')}.`,
      }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
    if (!e2) upserted++;
  }

  return { status: upserted > 0 ? ('success' as const) : ('unavailable' as const), count: upserted };
}

// Fetch official data from external sources
// `includeMandala`: when true, also invokes ingest-tse and ingest-anatel for MST indicators
export function useFetchOfficialData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ibgeCode, orgId, indicators, includeMandala }: {
      ibgeCode: string;
      orgId: string;
      indicators?: string[];
      includeMandala?: boolean;
    }) => {
      // Reset previous validation flags so fresh data is presented for re-validation
      await supabase
        .from('external_indicator_values')
        .update({ validated: false, validated_by: null, validated_at: null })
        .eq('municipality_ibge_code', ibgeCode)
        .eq('org_id', orgId);

      // Fire core sources in parallel: IBGE + CADASTUR + Mapa do Turismo bridge + ANA
      const corePromises: Promise<any>[] = [
        supabase.functions.invoke('fetch-official-data', {
          body: { ibge_code: ibgeCode, org_id: orgId, indicators },
        }),
        supabase.functions.invoke('ingest-cadastur', {
          body: { ibge_code: ibgeCode, org_id: orgId },
        }),
        bridgeMapaTurismoData(ibgeCode, orgId),
        supabase.functions.invoke('ingest-ana', {
          body: { ibge_code: ibgeCode, org_id: orgId },
        }),
      ];

      // When MST is enabled, also fetch TSE (electoral turnout) and Anatel (5G/Wi-Fi)
      if (includeMandala) {
        corePromises.push(
          supabase.functions.invoke('ingest-tse', {
            body: { ibge_code: ibgeCode, org_id: orgId },
          }),
          supabase.functions.invoke('ingest-anatel', {
            body: { ibge_code: ibgeCode, org_id: orgId },
          }),
        );
      }

      const settled = await Promise.allSettled(corePromises);
      const [officialResult, cadasturResult, mapaResult, anaResult, tseResult, anatelResult] = settled;

      const official = officialResult.status === 'fulfilled' ? officialResult.value : null;
      const cadastur = cadasturResult.status === 'fulfilled' ? cadasturResult.value : null;
      const mapa = mapaResult.status === 'fulfilled' ? mapaResult.value : null;
      const ana = anaResult.status === 'fulfilled' ? anaResult.value : null;
      const tse = tseResult?.status === 'fulfilled' ? tseResult.value : null;
      const anatel = anatelResult?.status === 'fulfilled' ? anatelResult.value : null;

      if (official?.error) throw official.error;
      if (!official?.data?.success) throw new Error(official?.data?.error || 'Erro ao buscar dados oficiais');

      // Merge statuses into response
      const cadasturStatus = cadastur?.data?.results || {};
      const anaStatus = ana?.data?.results || {};
      return {
        ...official.data,
        cadastur_status: cadasturStatus,
        mapa_turismo_status: mapa || { status: 'unavailable', count: 0 },
        ana_status: anaStatus,
        mst_status: includeMandala ? {
          tse: tse?.data || null,
          anatel: anatel?.data || null,
        } : null,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['external-indicator-values', variables.ibgeCode, variables.orgId] 
      });

      const cadasturInfo = data.cadastur_status;
      const cadasturMsg = cadasturInfo
        ? Object.entries(cadasturInfo).map(([k, v]: [string, any]) => 
            `${k}: ${v.status === 'success' ? `${v.count} registros` : v.status === 'unavailable' ? 'indisponível' : 'erro'}`
          ).join('; ')
        : '';

      const mapaMsg = data.mapa_turismo_status?.status === 'success' 
        ? `${data.mapa_turismo_status.count} indicadores` 
        : '';

      const anaIqa = data.ana_status?.iqa;
      const anaMsg = anaIqa?.status === 'success'
        ? `IQA: ${anaIqa.avg_iqa} (${anaIqa.stations_count} estações)`
        : '';

      const extras = [cadasturMsg, mapaMsg, anaMsg].filter(Boolean).join(' | ');

      toast({
        title: 'Dados oficiais carregados',
        description: `${data.message}${extras ? ` | ${extras}` : ''}`,
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

// Trigger CADASTUR ingestion independently
export function useIngestCadastur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ibgeCode, orgId }: { ibgeCode: string; orgId: string }) => {
      const { data, error } = await supabase.functions.invoke('ingest-cadastur', {
        body: { ibge_code: ibgeCode, org_id: orgId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['external-indicator-values', variables.ibgeCode, variables.orgId] 
      });
      const results = data?.results || {};
      const unavailable = Object.values(results).filter((r: any) => r.status === 'unavailable');
      if (unavailable.length > 0) {
        toast({
          title: 'CADASTUR parcialmente indisponível',
          description: 'Alguns datasets do CADASTUR não estão acessíveis no momento. Os dados existentes foram preservados.',
        });
      } else {
        toast({
          title: 'Dados CADASTUR atualizados',
          description: data.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao buscar dados CADASTUR',
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
