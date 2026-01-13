import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicDestinationSummary {
  destination_id: string;
  name: string;
  uf: string | null;
  ibge_code: string | null;
  latitude: number | null;
  longitude: number | null;
  latest_assessment_id: string;
  latest_assessment_date: string | null;
  pillar_scores: Record<string, { score: number; severity: string }> | null;
  territorial_impact_index: number | null;
  certification_level: string | null;
  esg_score: number | null;
  sdg_alignments: number[] | null;
  environmental_impact: number | null;
  social_impact: number | null;
  institutional_impact: number | null;
  economic_impact: number | null;
  certification_eligible: boolean | null;
  ready_for_visitors: boolean | null;
  indicator_count: number | null;
}

export function usePublicDestinations(onlyReadyForVisitors = true) {
  const { data: destinations, isLoading, error } = useQuery({
    queryKey: ['public-destinations', onlyReadyForVisitors],
    queryFn: async () => {
      let query = supabase
        .from('public_destination_summary')
        .select('*')
        .order('territorial_impact_index', { ascending: false, nullsFirst: false });

      if (onlyReadyForVisitors) {
        query = query.eq('ready_for_visitors', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PublicDestinationSummary[];
    },
  });

  return {
    destinations,
    isLoading,
    error,
    certifiedCount: destinations?.filter((d) => d.certification_eligible).length ?? 0,
    readyCount: destinations?.filter((d) => d.ready_for_visitors).length ?? 0,
  };
}

export function usePublicDestination(destinationId: string) {
  const { data: destination, isLoading, error } = useQuery({
    queryKey: ['public-destination', destinationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_destination_summary')
        .select('*')
        .eq('destination_id', destinationId)
        .maybeSingle();

      if (error) throw error;
      return data as PublicDestinationSummary | null;
    },
    enabled: !!destinationId,
  });

  return {
    destination,
    isLoading,
    error,
  };
}
