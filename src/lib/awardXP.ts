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
      .select('total_xp, level, current_streak, longest_streak, last_activity_date')
      .eq('user_id', uid)
      .maybeSingle();
    const prevTotal = cur?.total_xp ?? 0;
    const prevLevel = cur?.level ?? 1;
    const newTotal = prevTotal + input.points;
    const newLevel = levelFromXP(newTotal);

    // Streak: contar dia local (UTC offset do navegador)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const last = cur?.last_activity_date ? String(cur.last_activity_date) : null;
    let currentStreak = cur?.current_streak ?? 0;
    if (last === todayStr) {
      // mesmo dia — mantém
      currentStreak = currentStreak || 1;
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      currentStreak = last === yStr ? currentStreak + 1 : 1;
    }
    const longestStreak = Math.max(cur?.longest_streak ?? 0, currentStreak);

    await supabase
      .from('edu_user_xp')
      .upsert(
        {
          user_id: uid,
          total_xp: newTotal,
          level: newLevel,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_activity_date: todayStr,
        },
        { onConflict: 'user_id' },
      );

    // Email de level up (somente se subiu de nível e não é a fonte 'badge_earned' que já dispara seu próprio email)
    if (newLevel > prevLevel) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'edu-level-up',
            recipientEmail: u.user.email,
            idempotencyKey: `levelup-${uid}-${newLevel}`,
            templateData: { level: newLevel, totalXp: newTotal },
          },
        });
      } catch {}
    }
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