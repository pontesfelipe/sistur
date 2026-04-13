import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MapaTurismoMunicipio {
  id: string;
  ibge_code: string | null;
  municipio: string;
  uf: string;
  regiao_turistica: string | null;
  macrorregiao: string | null;
  categoria: string | null;
  municipality_type: string | null;
  ano_referencia: number;
  fonte: string;
  created_at: string;
}

export interface MapaTurismoSyncLog {
  id: string;
  sync_type: string;
  ano_referencia: number | null;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  triggered_by: string | null;
}

export function useMapaTurismo(filters?: { uf?: string; ano?: number; categoria?: string }) {
  return useQuery({
    queryKey: ['mapa-turismo', filters],
    queryFn: async () => {
      let query = supabase
        .from('mapa_turismo_municipios')
        .select('*')
        .order('uf')
        .order('municipio');

      if (filters?.uf) query = query.eq('uf', filters.uf);
      if (filters?.ano) query = query.eq('ano_referencia', filters.ano);
      if (filters?.categoria) query = query.eq('categoria', filters.categoria);

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return (data || []) as MapaTurismoMunicipio[];
    },
  });
}

export function useMapaTurismoStats() {
  return useQuery({
    queryKey: ['mapa-turismo-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mapa_turismo_municipios')
        .select('uf, categoria, municipality_type, ano_referencia');

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const years = [...new Set(data.map(d => d.ano_referencia))].sort().reverse();
      const latestYear = years[0];
      const latestData = data.filter(d => d.ano_referencia === latestYear);

      const byUF = new Map<string, number>();
      const byCategoria = new Map<string, number>();
      const byType = new Map<string, number>();

      latestData.forEach(d => {
        byUF.set(d.uf, (byUF.get(d.uf) || 0) + 1);
        if (d.categoria) byCategoria.set(d.categoria, (byCategoria.get(d.categoria) || 0) + 1);
        if (d.municipality_type) byType.set(d.municipality_type, (byType.get(d.municipality_type) || 0) + 1);
      });

      return {
        totalMunicipios: latestData.length,
        latestYear,
        availableYears: years,
        byUF: Object.fromEntries(byUF),
        byCategoria: Object.fromEntries(byCategoria),
        byType: Object.fromEntries(byType),
      };
    },
  });
}

export function useMapaTurismoSyncLogs() {
  return useQuery({
    queryKey: ['mapa-turismo-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mapa_turismo_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as MapaTurismoSyncLog[];
    },
  });
}

export function useIngestMapaTurismo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { year: number; sync_type: 'mapa_turismo' | 'categorizacao'; use_firecrawl?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('ingest-mapa-turismo', {
        body: params,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na ingestão');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mapa-turismo'] });
      queryClient.invalidateQueries({ queryKey: ['mapa-turismo-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mapa-turismo-sync-logs'] });
      const sourceLabel = data.data_source === 'firecrawl' ? '🔥 Firecrawl' : '📊 CKAN';
      toast.success(`${data.records_inserted} municípios importados (${data.year}) via ${sourceLabel}. ${data.destinations_linked} destinos vinculados.`);
    },
    onError: (error) => {
      console.error('Ingestion error:', error);
      toast.error(`Erro na importação: ${error.message}`);
    },
  });
}

export function useMapaTurismoForDestination(municipio?: string, uf?: string) {
  return useQuery({
    queryKey: ['mapa-turismo-destination', municipio, uf],
    queryFn: async () => {
      if (!municipio || !uf) return null;

      const { data, error } = await supabase
        .from('mapa_turismo_municipios')
        .select('*')
        .ilike('municipio', municipio)
        .eq('uf', uf.toUpperCase())
        .order('ano_referencia', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MapaTurismoMunicipio | null;
    },
    enabled: !!municipio && !!uf,
  });
}
