import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiaryRow {
  student_id: string;
  student_name: string;
  enrolled_at: string;
  total_sessions: number;
  attendance_days: number;
  total_active_minutes: number;
  last_seen_at: string | null;
  assignments_total: number;
  assignments_completed: number;
  best_exam_score: number | null;
  exam_attempts: number;
  fraud_flags: number;
}

export function useClassroomDiary(classroomId: string | null) {
  return useQuery({
    queryKey: ['classroom-diary', classroomId],
    queryFn: async (): Promise<DiaryRow[]> => {
      if (!classroomId) return [];
      const { data, error } = await (supabase.rpc as any)('get_classroom_diary', {
        p_classroom_id: classroomId,
      });
      if (error) throw error;
      return (data ?? []) as DiaryRow[];
    },
    enabled: !!classroomId,
  });
}

export function diaryStats(rows: DiaryRow[]) {
  if (!rows.length) {
    return { totalAlunos: 0, ativos7d: 0, taxaConclusaoMedia: 0, mediaNota: null as number | null, alertas: 0 };
  }
  const now = Date.now();
  const ativos7d = rows.filter(r => r.last_seen_at && (now - new Date(r.last_seen_at).getTime()) < 7 * 86400000).length;
  const completionRates = rows
    .filter(r => r.assignments_total > 0)
    .map(r => (r.assignments_completed / r.assignments_total) * 100);
  const taxaConclusaoMedia = completionRates.length
    ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length
    : 0;
  const notas = rows.filter(r => r.best_exam_score !== null).map(r => Number(r.best_exam_score));
  const mediaNota = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const alertas = rows.reduce((sum, r) => sum + (r.fraud_flags || 0), 0);
  return { totalAlunos: rows.length, ativos7d, taxaConclusaoMedia, mediaNota, alertas };
}