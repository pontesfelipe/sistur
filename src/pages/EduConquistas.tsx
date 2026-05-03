import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Flag, Map as MapIcon, Flame, Sparkles, Award } from 'lucide-react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareAchievementImage } from '@/lib/shareAchievement';
import { DailyMissionsPanel } from '@/components/edu/DailyMissionsPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMemo } from 'react';
import {
  useMyXP,
  useMyXPEvents,
  useBadges,
  useMyBadges,
  xpForLevel,
} from '@/hooks/useGamification';

const ICONS: Record<string, any> = { Trophy, Star, Flag, Map: MapIcon, Flame, Sparkles, Award };

export default function EduConquistas() {
  const { data: xp, isLoading: xpLoading } = useMyXP();
  const { data: events } = useMyXPEvents();
  const { data: catalog } = useBadges();
  const { data: mine } = useMyBadges();

  const totalXp = xp?.total_xp ?? 0;
  const level = xp?.level ?? 1;
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const pctToNext = Math.min(
    100,
    Math.round(((totalXp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100),
  );

  const earnedSet = new Set((mine ?? []).map((m) => m.badge_id));

  // XP por mês (últimos 6 meses) a partir dos eventos
  const monthlyXP = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; xp: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      buckets.push({ key, label, xp: 0 });
    }
    (events ?? []).forEach((e) => {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.find((x) => x.key === key);
      if (b) b.xp += e.points;
    });
    return buckets;
  }, [events]);

  return (
    <AppLayout title="Minhas Conquistas">
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Minhas Conquistas</h1>
            <p className="text-sm text-muted-foreground">XP, nível e badges acumulados na plataforma.</p>
          </div>
        </div>

        <DailyMissionsPanel />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progressão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {xpLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-3xl font-bold">Nível {level}</div>
                    <div className="text-sm text-muted-foreground">{totalXp} XP totais</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {nextLevelXp - totalXp} XP para o nível {level + 1}
                  </div>
                </div>
                <Progress value={pctToNext} />
                {xp?.current_streak ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>Streak atual: <strong>{xp.current_streak}</strong> dias</span>
                    {xp.longest_streak ? (
                      <span className="text-muted-foreground">· recorde {xp.longest_streak}d</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      shareAchievementImage({
                        title: `Nível ${level} no SISTUR EDU`,
                        subtitle: `${totalXp} XP acumulados`,
                        emoji: '⭐',
                      })
                    }
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Compartilhar progresso
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">Badges</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(catalog ?? []).map((b) => {
              const Icon = ICONS[b.icon ?? 'Award'] ?? Award;
              const earned = earnedSet.has(b.id);
              return (
                <Card key={b.id} className={earned ? 'border-primary/50 bg-primary/5' : 'opacity-70'}>
                  <CardContent className="p-4 flex gap-3 items-start">
                    <div className={`p-2 rounded-lg ${earned ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{b.title}</span>
                        {earned && <UIBadge variant="default" className="text-xs">Conquistada</UIBadge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                      {b.criteria && (
                        <p className="text-xs mt-1"><span className="text-muted-foreground">Critério:</span> {b.criteria}</p>
                      )}
                      <div className="text-xs text-primary mt-1">+{b.xp_reward} XP</div>
                      {earned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 px-2 text-xs"
                          onClick={() => shareAchievementImage({ title: b.title, subtitle: b.description ?? undefined, emoji: '🏆' })}
                        >
                          <Share2 className="w-3 h-3 mr-1" /> Compartilhar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de XP</CardTitle>
            <CardDescription>Últimos 50 eventos</CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyXP} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => [`${v} XP`, 'Ganho no mês']}
                  />
                  <Bar dataKey="xp" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <CardContent>
            {!events?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem eventos ainda. Conclua cursos e etapas para começar.</p>
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                    <div>
                      <div className="font-medium">{e.description ?? e.source}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <UIBadge variant="outline" className="text-primary">+{e.points} XP</UIBadge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}