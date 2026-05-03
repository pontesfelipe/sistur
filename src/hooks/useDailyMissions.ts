import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DailyMission {
  id: string;
  user_id: string;
  mission_date: string;
  mission_code: string;
  title: string;
  description: string | null;
  target: number;
  progress: number;
  xp_reward: number;
  completed_at: string | null;
  bonus_awarded: boolean;
}

/**
 * Catálogo fixo de missões. A cada dia, 3 são sorteadas
 * deterministicamente a partir da data + user_id.
 */
export const MISSION_CATALOG: Array<{
  code: string;
  title: string;
  description: string;
  target: number;
  xp: number;
  source: 'step_completed' | 'course_completed' | 'exam_passed' | 'badge_earned';
}> = [
  { code: 'watch_module', title: 'Estude um módulo', description: 'Conclua 1 módulo de qualquer treinamento hoje.', target: 1, xp: 30, source: 'step_completed' },
  { code: 'finish_course', title: 'Conclua um curso', description: 'Finalize 1 treinamento por completo.', target: 1, xp: 60, source: 'course_completed' },
  { code: 'pass_exam', title: 'Aprove em uma prova', description: 'Tire nota de aprovação em 1 exame.', target: 1, xp: 75, source: 'exam_passed' },
  { code: 'three_steps', title: 'Maratona leve', description: 'Conclua 3 etapas de trilhas/módulos hoje.', target: 3, xp: 50, source: 'step_completed' },
  { code: 'earn_badge', title: 'Conquiste uma badge', description: 'Desbloqueie qualquer badge nova hoje.', target: 1, xp: 40, source: 'badge_earned' },
  { code: 'two_courses', title: 'Combo de cursos', description: 'Conclua 2 treinamentos no mesmo dia.', target: 2, xp: 100, source: 'course_completed' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Hash determinístico simples para sortear missões do dia. */
function pickDaily(uid: string, date: string): typeof MISSION_CATALOG {
  const seed = [...(uid + date)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool = [...MISSION_CATALOG];
  const out: typeof MISSION_CATALOG = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = (seed + i * 7) % pool.length;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function useDailyMissions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useQuery({
    queryKey: ['edu-daily-missions', user?.id, todayStr()],
    enabled: !!user?.id,
    queryFn: async () => {
      const uid = user!.id;
      const date = todayStr();

      // 1) lê as do dia
      const { data: existing, error } = await supabase
        .from('edu_daily_missions')
        .select('*')
        .eq('user_id', uid)
        .eq('mission_date', date);
      if (error) throw error;

      if (existing && existing.length >= 3) return existing as DailyMission[];

      // 2) gera as faltantes
      const picks = pickDaily(uid, date);
      const have = new Set((existing ?? []).map((m: any) => m.mission_code));
      const toInsert = picks
        .filter((p) => !have.has(p.code))
        .slice(0, 3 - (existing?.length ?? 0))
        .map((p) => ({
          user_id: uid,
          mission_date: date,
          mission_code: p.code,
          title: p.title,
          description: p.description,
          target: p.target,
          xp_reward: p.xp,
        }));
      if (toInsert.length) {
        await supabase.from('edu_daily_missions').insert(toInsert);
      }
      const { data: refreshed } = await supabase
        .from('edu_daily_missions')
        .select('*')
        .eq('user_id', uid)
        .eq('mission_date', date);
      qc.invalidateQueries({ queryKey: ['edu-daily-missions'] });
      return (refreshed ?? []) as DailyMission[];
    },
  });
}

/**
 * Avança missões do dia compatíveis com a `source` informada.
 * Idempotente por chamada — apenas soma 1 ao progresso.
 * Quando a missão atinge o alvo, paga o XP bônus uma única vez.
 * Chamado fire-and-forget após eventos de XP.
 */
export async function progressDailyMissions(source: DailyMission extends never ? never : 'step_completed' | 'course_completed' | 'exam_passed' | 'badge_earned') {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uid = u.user.id;
    const date = todayStr();

    const { data: missions } = await supabase
      .from('edu_daily_missions')
      .select('*')
      .eq('user_id', uid)
      .eq('mission_date', date);
    if (!missions?.length) return;

    for (const m of missions as DailyMission[]) {
      if (m.completed_at) continue;
      const def = MISSION_CATALOG.find((c) => c.code === m.mission_code);
      if (!def || def.source !== source) continue;

      const newProgress = Math.min(m.target, m.progress + 1);
      const completed = newProgress >= m.target;
      await supabase
        .from('edu_daily_missions')
        .update({
          progress: newProgress,
          completed_at: completed ? new Date().toISOString() : null,
          bonus_awarded: completed,
        })
        .eq('id', m.id);

      if (completed && !m.bonus_awarded) {
        const { awardXP } = await import('@/lib/awardXP');
        await awardXP({
          source: 'manual',
          points: m.xp_reward,
          description: `Missão diária: ${m.title}`,
        });
        toast.success(`🎯 Missão concluída: ${m.title} (+${m.xp_reward} XP)`);
      }
    }
  } catch (e) {
    console.warn('[progressDailyMissions] falhou silenciosamente:', e);
  }
}