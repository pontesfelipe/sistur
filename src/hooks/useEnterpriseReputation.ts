import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReviewSnapshot {
  id: string;
  org_id: string;
  destination_id: string;
  snapshot_date: string;
  source: string;
  rating: number | null;
  review_volume: number | null;
  response_rate: number | null;
  sentiment_positive_pct: number | null;
  raw_data: any;
  created_at: string;
}

export interface Competitor {
  id: string;
  org_id: string;
  destination_id: string;
  name: string;
  location: string | null;
  property_type: string | null;
  rating: number | null;
  review_volume: number | null;
  distance_km: number | null;
  source_url: string | null;
  source_name: string | null;
  notes: string | null;
  is_manual: boolean;
  captured_at: string;
}

export function useReviewSnapshots(destinationId: string | null) {
  const qc = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['enterprise-review-snapshots', destinationId],
    queryFn: async () => {
      if (!destinationId) return [] as ReviewSnapshot[];
      const { data, error } = await supabase
        .from('enterprise_review_snapshots' as any)
        .select('*')
        .eq('destination_id', destinationId)
        .order('snapshot_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReviewSnapshot[];
    },
    enabled: !!destinationId,
  });

  const addSnapshot = useMutation({
    mutationFn: async (row: Partial<ReviewSnapshot> & { destination_id: string; org_id: string; source: string }) => {
      const { data, error } = await supabase
        .from('enterprise_review_snapshots' as any)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-review-snapshots', destinationId] });
      toast.success('Snapshot registrado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar snapshot'),
  });

  const removeSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enterprise_review_snapshots' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprise-review-snapshots', destinationId] }),
  });

  return { snapshots, isLoading, addSnapshot, removeSnapshot };
}

export function useCompetitors(destinationId: string | null) {
  const qc = useQueryClient();

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['enterprise-competitors', destinationId],
    queryFn: async () => {
      if (!destinationId) return [] as Competitor[];
      const { data, error } = await supabase
        .from('enterprise_competitors' as any)
        .select('*')
        .eq('destination_id', destinationId)
        .order('rating', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as Competitor[];
    },
    enabled: !!destinationId,
  });

  const upsertCompetitor = useMutation({
    mutationFn: async (row: Partial<Competitor> & { destination_id: string; org_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('enterprise_competitors' as any)
        .upsert({ ...row, is_manual: row.is_manual ?? true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-competitors', destinationId] });
      toast.success('Concorrente salvo');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar concorrente'),
  });

  const removeCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enterprise_competitors' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprise-competitors', destinationId] }),
  });

  const searchCompetitors = useMutation({
    mutationFn: async (args: { destination_id: string; business_name: string; location: string; property_type?: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke('search-competitors', { body: args });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['enterprise-competitors', destinationId] });
      toast.success(`${data?.count ?? 0} concorrentes capturados`);
    },
    onError: (e: any) => toast.error(e.message || 'Falha na busca'),
  });

  const ratings = competitors.map((c) => Number(c.rating)).filter((v) => !isNaN(v) && v > 0);
  const avgCompetitorRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return { competitors, isLoading, upsertCompetitor, removeCompetitor, searchCompetitors, avgCompetitorRating };
}
