import { supabase } from '@/integrations/supabase/client';
import { awardXP } from '@/lib/awardXP';

/**
 * Concede uma badge ao usuário autenticado (idempotente via UNIQUE user_id+badge_id)
 * e adiciona o XP de recompensa correspondente. Falhas são silenciadas para nunca
 * quebrar o fluxo principal (conclusão de etapa, prova, curso).
 */
export async function autoClaimBadge(code: string) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uid = u.user.id;

    const { data: badge } = await supabase
      .from('edu_badges')
      .select('id, code, title, xp_reward, active')
      .eq('code', code)
      .maybeSingle();
    if (!badge || !badge.active) return;

    const { data: existing } = await supabase
      .from('edu_user_badges')
      .select('id')
      .eq('user_id', uid)
      .eq('badge_id', badge.id)
      .maybeSingle();
    if (existing) return;

    const { error } = await supabase
      .from('edu_user_badges')
      .insert({ user_id: uid, badge_id: badge.id });
    if (error) return;

    if (badge.xp_reward > 0) {
      await awardXP({
        source: 'badge_earned',
        points: badge.xp_reward,
        reference_id: badge.id,
        description: `Badge: ${badge.title}`,
      });
    }

    // Email de badge conquistada (best-effort)
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'edu-badge-earned',
          recipientEmail: u.user.email,
          idempotencyKey: `badge-${uid}-${badge.id}`,
          templateData: { badgeTitle: badge.title, xpReward: badge.xp_reward },
        },
      });
    } catch {}
  } catch (e) {
    console.warn('[autoClaimBadge] falhou silenciosamente:', e);
  }
}

/** Conta cursos concluídos pelo usuário atual via edu_detailed_progress. */
export async function countCompletedCourses(): Promise<number> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 0;
  const { data } = await supabase
    .from('edu_detailed_progress')
    .select('training_id, completed_at')
    .eq('user_id', u.user.id)
    .not('completed_at', 'is', null);
  const ids = new Set((data ?? []).map((r: any) => r.training_id));
  return ids.size;
}