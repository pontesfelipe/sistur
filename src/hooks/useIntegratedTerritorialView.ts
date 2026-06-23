import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IntegratedTerritorialData {
  matched: boolean;
  reason?: 'no_ibge' | 'no_assessment' | 'not_calculated';
  destination?: {
    id: string;
    name: string;
    state: string | null;
    ibge_code: string | null;
  };
  assessment?: {
    id: string;
    title: string | null;
    period_year: number | null;
    calculated_at: string | null;
    status: string;
  };
  pillarScores?: Array<{ pillar: string; score: number; severity: string }>;
  issues?: Array<{ id: string; pillar: string; title: string; severity: string; description?: string | null }>;
  igmaInterpretation?: any;
}

/**
 * Fase 14.6 — Visão Integrada.
 * Dado o destino do diagnóstico Empresarial (geralmente um empreendimento com
 * `ibge_code` do município onde opera), localiza o diagnóstico Territorial
 * CALCULATED mais recente do MESMO município (qualquer organização) e retorna
 * pilares, gargalos e interpretação IGMA para cruzamento contextual.
 */
export function useIntegratedTerritorialView(
  enterpriseDestinationId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery<IntegratedTerritorialData>({
    queryKey: ['integrated-territorial', enterpriseDestinationId],
    enabled: !!enterpriseDestinationId && enabled,
    queryFn: async () => {
      // 1) Look up ibge_code on the empresarial destination
      const { data: entDest, error: e0 } = await supabase
        .from('destinations')
        .select('id, name, state, ibge_code')
        .eq('id', enterpriseDestinationId!)
        .maybeSingle();
      if (e0) throw e0;
      if (!entDest?.ibge_code) {
        return { matched: false, reason: 'no_ibge' };
      }

      // 2) Find territorial destinations sharing the same IBGE (any org)
      const { data: terrDests, error: e1 } = await supabase
        .from('destinations')
        .select('id, name, state, ibge_code')
        .eq('ibge_code', entDest.ibge_code);
      if (e1) throw e1;
      const terrDestIds = (terrDests || []).map((d: any) => d.id);
      if (terrDestIds.length === 0) {
        return { matched: false, reason: 'no_assessment' };
      }

      // 3) Pick the most recent CALCULATED territorial assessment
      const { data: assessments, error: e2 } = await supabase
        .from('assessments')
        .select('id, title, period_year, calculated_at, status, destination_id, diagnostic_type, igma_interpretation')
        .in('destination_id', terrDestIds)
        .eq('diagnostic_type', 'territorial')
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (e2) throw e2;
      const assessment = (assessments || [])[0];
      if (!assessment) {
        return { matched: false, reason: 'not_calculated' };
      }
      const matchedDest = (terrDests || []).find((d: any) => d.id === assessment.destination_id) || terrDests![0];

      // 4) Pillar scores + issues
      const [{ data: pillars }, { data: issues }] = await Promise.all([
        supabase
          .from('pillar_scores')
          .select('pillar, score, severity')
          .eq('assessment_id', assessment.id),
        supabase
          .from('issues')
          .select('id, pillar, title, severity, description')
          .eq('assessment_id', assessment.id)
          .order('severity', { ascending: true }),
      ]);

      return {
        matched: true,
        destination: matchedDest as any,
        assessment: {
          id: assessment.id,
          title: assessment.title,
          period_year: assessment.period_year,
          calculated_at: assessment.calculated_at,
          status: assessment.status,
        },
        pillarScores: (pillars || []) as any,
        issues: (issues || []) as any,
        igmaInterpretation: (assessment as any).igma_interpretation,
      };
    },
  });
}
