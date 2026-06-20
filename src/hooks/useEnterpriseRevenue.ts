import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EnterpriseChannelType =
  | 'DIRETO'
  | 'OTA'
  | 'AGENCIA'
  | 'CORPORATIVO'
  | 'EVENTOS'
  | 'OUTRO';

export interface DistributionChannel {
  id: string;
  org_id: string;
  destination_id: string;
  channel_name: string;
  channel_type: EnterpriseChannelType;
  share_pct: number;
  commission_pct: number;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeasonalityMonth {
  id: string;
  org_id: string;
  destination_id: string;
  year: number;
  month: number;
  occupancy_rate: number | null;
  adr: number | null;
  revpar: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDistributionChannels(destinationId: string | null) {
  const qc = useQueryClient();

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['enterprise-channels', destinationId],
    queryFn: async () => {
      if (!destinationId) return [] as DistributionChannel[];
      const { data, error } = await supabase
        .from('enterprise_distribution_channels' as any)
        .select('*')
        .eq('destination_id', destinationId)
        .order('share_pct', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DistributionChannel[];
    },
    enabled: !!destinationId,
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<DistributionChannel> & { destination_id: string; org_id: string; channel_name: string; channel_type: EnterpriseChannelType }) => {
      const { data, error } = await supabase
        .from('enterprise_distribution_channels' as any)
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-channels', destinationId] });
      toast.success('Canal salvo');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar canal'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enterprise_distribution_channels' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-channels', destinationId] });
      toast.success('Canal removido');
    },
  });

  // Derived metrics
  const totalShare = channels.reduce((s, c) => s + Number(c.share_pct || 0), 0);
  const weightedCommission = totalShare > 0
    ? channels.reduce((s, c) => s + (Number(c.share_pct) * Number(c.commission_pct)), 0) / totalShare
    : 0;
  const directShare = channels
    .filter((c) => c.channel_type === 'DIRETO')
    .reduce((s, c) => s + Number(c.share_pct || 0), 0);

  return { channels, isLoading, upsert, remove, totalShare, weightedCommission, directShare };
}

export function useSeasonalityMonths(destinationId: string | null, year?: number) {
  const qc = useQueryClient();
  const targetYear = year ?? new Date().getFullYear();

  const { data: months = [], isLoading } = useQuery({
    queryKey: ['enterprise-seasonality', destinationId, targetYear],
    queryFn: async () => {
      if (!destinationId) return [] as SeasonalityMonth[];
      const { data, error } = await supabase
        .from('enterprise_seasonality_months' as any)
        .select('*')
        .eq('destination_id', destinationId)
        .eq('year', targetYear)
        .order('month');
      if (error) throw error;
      return (data || []) as unknown as SeasonalityMonth[];
    },
    enabled: !!destinationId,
  });

  const upsertMonth = useMutation({
    mutationFn: async (row: Partial<SeasonalityMonth> & { destination_id: string; org_id: string; year: number; month: number }) => {
      const { data, error } = await supabase
        .from('enterprise_seasonality_months' as any)
        .upsert(row, { onConflict: 'destination_id,year,month' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprise-seasonality', destinationId, targetYear] }),
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar mês'),
  });

  // Coefficient of variation of occupancy across filled months
  const occ = months.map((m) => Number(m.occupancy_rate)).filter((v) => !isNaN(v) && v > 0);
  let seasonalityIndex = 0;
  if (occ.length >= 3) {
    const mean = occ.reduce((a, b) => a + b, 0) / occ.length;
    const variance = occ.reduce((s, v) => s + (v - mean) ** 2, 0) / occ.length;
    const std = Math.sqrt(variance);
    seasonalityIndex = mean > 0 ? std / mean : 0;
  }

  return { months, isLoading, upsertMonth, seasonalityIndex, year: targetYear };
}
