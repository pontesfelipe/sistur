import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TranscriptRow {
  training_id: string;
  course_title: string;
  pillar: string;
  curriculum_level: number | null;
  duration_minutes: number | null;
  status: 'concluido' | 'em_andamento' | 'nao_iniciado';
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  best_score: number | null;
  attempts_count: number;
  certificate_id: string | null;
  certificate_issued_at: string | null;
}

export function useStudentTranscript(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId ?? user?.id;

  return useQuery({
    queryKey: ['student-transcript', userId],
    queryFn: async (): Promise<TranscriptRow[]> => {
      if (!userId) return [];
      const { data, error } = await (supabase.rpc as any)('get_student_transcript', {
        p_user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as TranscriptRow[];
    },
    enabled: !!userId,
  });
}

export function transcriptStats(rows: TranscriptRow[]) {
  const concluidos = rows.filter(r => r.status === 'concluido');
  const totalHoras = concluidos.reduce((sum, r) => sum + Math.round((r.duration_minutes ?? 0) / 60), 0);
  const cursosComNota = concluidos.filter(r => r.best_score !== null);
  const mediaPonderada = cursosComNota.length > 0
    ? cursosComNota.reduce((sum, r) => sum + (Number(r.best_score) * (r.duration_minutes ?? 60)), 0) /
      cursosComNota.reduce((sum, r) => sum + (r.duration_minutes ?? 60), 0)
    : null;
  return {
    totalCursos: rows.length,
    concluidos: concluidos.length,
    emAndamento: rows.filter(r => r.status === 'em_andamento').length,
    certificados: rows.filter(r => !!r.certificate_id).length,
    totalHoras,
    mediaPonderada,
  };
}