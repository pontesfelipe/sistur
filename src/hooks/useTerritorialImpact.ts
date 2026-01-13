import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CertificationLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TerritorialImpactScore {
  id: string;
  assessment_id: string;
  destination_id: string;
  org_id: string;
  environmental_impact: number;
  social_impact: number;
  institutional_impact: number;
  economic_impact: number;
  territorial_impact_index: number;
  certification_eligible: boolean;
  certification_level: CertificationLevel | null;
  esg_score: number | null;
  sdg_alignments: number[];
  calculation_method: string;
  calculated_at: string;
}

export const CERTIFICATION_LABELS: Record<CertificationLevel, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
};

export const CERTIFICATION_COLORS: Record<CertificationLevel, string> = {
  BRONZE: 'bg-orange-100 text-orange-800 border-orange-300',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PLATINUM: 'bg-purple-100 text-purple-800 border-purple-300',
};

export const SDG_LABELS: Record<number, string> = {
  1: 'Erradicação da Pobreza',
  8: 'Trabalho Decente e Crescimento Econômico',
  9: 'Indústria, Inovação e Infraestrutura',
  10: 'Redução das Desigualdades',
  13: 'Ação Contra a Mudança Global do Clima',
  14: 'Vida na Água',
  15: 'Vida Terrestre',
  16: 'Paz, Justiça e Instituições Eficazes',
  17: 'Parcerias e Meios de Implementação',
};

export function useTerritorialImpact(assessmentId?: string) {
  const { data: impactScore, isLoading } = useQuery({
    queryKey: ['territorial-impact', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null;

      const { data, error } = await supabase
        .from('territorial_impact_scores')
        .select('*')
        .eq('assessment_id', assessmentId)
        .maybeSingle();

      if (error) throw error;
      return data as TerritorialImpactScore | null;
    },
    enabled: !!assessmentId,
  });

  return {
    impactScore,
    isLoading,
  };
}

export function useTerritorialImpactByDestination(destinationId?: string) {
  const { data: impactScores, isLoading } = useQuery({
    queryKey: ['territorial-impact-destination', destinationId],
    queryFn: async () => {
      if (!destinationId) return [];

      const { data, error } = await supabase
        .from('territorial_impact_scores')
        .select('*, assessments(title, calculated_at)')
        .eq('destination_id', destinationId)
        .order('calculated_at', { ascending: false });

      if (error) throw error;
      return data as (TerritorialImpactScore & {
        assessments: { title: string; calculated_at: string } | null;
      })[];
    },
    enabled: !!destinationId,
  });

  return {
    impactScores,
    isLoading,
    latestScore: impactScores?.[0] ?? null,
  };
}

export function useCertifiedDestinations() {
  const { data: certifiedDestinations, isLoading } = useQuery({
    queryKey: ['certified-destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territorial_impact_scores')
        .select(`
          *,
          destinations(id, name, uf, ibge_code),
          assessments(id, title, calculated_at)
        `)
        .eq('certification_eligible', true)
        .order('territorial_impact_index', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return {
    certifiedDestinations,
    isLoading,
  };
}
