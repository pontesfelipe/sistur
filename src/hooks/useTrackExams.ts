/**
 * SISTUR EDU - Track Exam Hooks
 *
 * Manages per-pillar final exams attached to learning tracks (edu_tracks).
 * Each (track_id, pillar) maps to one exam_ruleset configured at track creation
 * time (or via the "Gerar prova" button).
 *
 * Backend: edu_track_exam_rulesets bridge table + generate_track_exam_rulesets RPC.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Pillar = 'RA' | 'OE' | 'AO';

export interface TrackExamRuleset {
  id: string;
  track_id: string;
  pillar: Pillar;
  ruleset_id: string;
  created_at: string;
  ruleset?: {
    ruleset_id: string;
    question_count: number;
    min_score_pct: number;
    time_limit_minutes: number;
    max_attempts: number;
  };
}

const DEFAULTS = {
  question_count: 20,
  min_score_pct: 70,
  time_limit_minutes: 60,
  max_attempts: 2,
};

/**
 * List exam rulesets attached to a given track, joined with the ruleset config.
 */
export function useTrackExams(trackId?: string) {
  return useQuery({
    queryKey: ['track-exams', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const { data, error } = await supabase
        .from('edu_track_exam_rulesets')
        .select(
          'id, track_id, pillar, ruleset_id, created_at, ruleset:exam_rulesets(ruleset_id, question_count, min_score_pct, time_limit_minutes, max_attempts)'
        )
        .eq('track_id', trackId)
        .order('pillar', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as TrackExamRuleset[];
    },
    enabled: !!trackId,
  });
}

/**
 * Calls the generate_track_exam_rulesets RPC. Creates one ruleset per pillar
 * present among the track's trainings. If overwrite is false, existing pillar
 * rulesets are kept.
 */
export function useGenerateTrackExams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackId,
      overwrite = false,
      questionCount = DEFAULTS.question_count,
      minScorePct = DEFAULTS.min_score_pct,
      timeLimitMinutes = DEFAULTS.time_limit_minutes,
      maxAttempts = DEFAULTS.max_attempts,
    }: {
      trackId: string;
      overwrite?: boolean;
      questionCount?: number;
      minScorePct?: number;
      timeLimitMinutes?: number;
      maxAttempts?: number;
    }) => {
      const { data, error } = await (supabase.rpc as any)(
        'generate_track_exam_rulesets',
        {
          p_track_id: trackId,
          p_question_count: questionCount,
          p_min_score_pct: minScorePct,
          p_time_limit_minutes: timeLimitMinutes,
          p_max_attempts: maxAttempts,
          p_overwrite: overwrite,
        }
      );
      if (error) throw error;
      return (data || []) as { pillar: Pillar; ruleset_id: string; created: boolean }[];
    },
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-exams', variables.trackId] });
      const created = results.filter((r) => r.created).length;
      const kept = results.length - created;
      if (results.length === 0) {
        toast.info('Nenhum pilar elegível encontrado nos treinamentos desta trilha.');
      } else if (created > 0) {
        toast.success(
          `${created} prova${created > 1 ? 's' : ''} gerada${created > 1 ? 's' : ''}` +
            (kept > 0 ? ` (${kept} já existia${kept > 1 ? 'm' : ''})` : '')
        );
      } else {
        toast.info('Todas as provas desta trilha já existem.');
      }
    },
    onError: (error: any) => {
      const msg = error?.message || 'Erro desconhecido';
      if (msg.includes('not_authorized')) {
        toast.error('Apenas administradores podem gerar provas para esta trilha.');
      } else {
        toast.error(`Erro ao gerar provas: ${msg}`);
      }
    },
  });
}
