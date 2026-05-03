import { supabase } from '@/integrations/supabase/client';
import { levelFromXP } from '@/hooks/useGamification';

type Source = 'course_completed' | 'step_completed' | 'exam_passed' | 'badge_earned' | 'manual';

/**
 * Concede XP ao usuário autenticado e recalcula nível.
 * Uso fire-and-forget em mutações de conclusão (curso, etapa de trilha, prova aprovada).
 * Erros são apenas logados — XP nunca deve quebrar o fluxo principal.
 */
export async function awardXP(input: {
  source: Source;
  points: number;
  reference_id?: string;
  description?: string;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uid = u.user.id;

    await supabase.from('edu_xp_events').insert({
      user_id: uid,
      source: input.source,
      points: input.points,
      reference_id: input.reference_id ?? null,
      description: input.description ?? null,
    });

    const { data: cur } = await supabase
      .from('edu_user_xp')
      .select('total_xp')
      .eq('user_id', uid)
      .maybeSingle();
    const newTotal = (cur?.total_xp ?? 0) + input.points;
    const newLevel = levelFromXP(newTotal);

    await supabase
      .from('edu_user_xp')
      .upsert({ user_id: uid, total_xp: newTotal, level: newLevel }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[awardXP] falhou silenciosamente:', e);
  }
}

export const XP_VALUES = {
  STEP_COMPLETED: 25,
  COURSE_COMPLETED: 50,
  EXAM_PASSED: 75,
  PATH_COMPLETED: 150,
} as const;