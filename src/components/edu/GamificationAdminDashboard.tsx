import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Flame, Award, Target, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TopXP { user_id: string; total_xp: number; level: number; current_streak: number; full_name?: string | null; }
interface BadgeCount { badge_id: string; title: string; icon: string | null; count: number; }

function useGamificationStats() {
  return useQuery({
    queryKey: ['admin-gamification-stats'],
    queryFn: async () => {
      // Top 10 alunos por XP
      const { data: xpRows } = await supabase
        .from('edu_user_xp')
        .select('user_id, total_xp, level, current_streak, longest_streak')
        .order('total_xp', { ascending: false })
        .limit(10);

      const ids = (xpRows ?? []).map((r: any) => r.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', ids)
        : { data: [] as any[] };
      const nameById = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
      const topXP: TopXP[] = (xpRows ?? []).map((r: any) => ({ ...r, full_name: nameById.get(r.user_id) ?? '—' }));

      // Badges mais conquistadas
      const { data: ub } = await supabase.from('edu_user_badges').select('badge_id');
      const counts = new Map<string, number>();
      (ub ?? []).forEach((r: any) => counts.set(r.badge_id, (counts.get(r.badge_id) ?? 0) + 1));
      const { data: badges } = await supabase.from('edu_badges').select('id, title, icon');
      const badgeStats: BadgeCount[] = (badges ?? [])
        .map((b: any) => ({ badge_id: b.id, title: b.title, icon: b.icon, count: counts.get(b.id) ?? 0 }))
        .sort((a, b) => b.count - a.count);

      // Totais agregados
      const { count: totalUsers } = await supabase.from('edu_user_xp').select('*', { count: 'exact', head: true });
      const { count: totalBadgesEarned } = await supabase.from('edu_user_badges').select('*', { count: 'exact', head: true });
      const totalXP = (xpRows ?? []).reduce((acc: number, r: any) => acc + (r.total_xp ?? 0), 0);

      // Missões concluídas (últimos 7 dias)
      const since = new Date(); since.setDate(since.getDate() - 6);
      const { data: missions } = await supabase
        .from('edu_daily_missions')
        .select('completed_at')
        .gte('mission_date', since.toISOString().slice(0, 10))
        .not('completed_at', 'is', null);

      const buckets: { day: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        buckets.push({ day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), count: 0 });
      }
      (missions ?? []).forEach((m: any) => {
        const d = new Date(m.completed_at);
        const idx = 6 - Math.floor((Date.now() - d.getTime()) / 86400000);
        if (idx >= 0 && idx < 7) buckets[idx].count += 1;
      });

      return { topXP, badgeStats, totalUsers: totalUsers ?? 0, totalBadgesEarned: totalBadgesEarned ?? 0, totalXP, missionsByDay: buckets };
    },
  });
}

export function GamificationAdminDashboard() {
  const { data, isLoading } = useGamificationStats();

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos com XP</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP do Top 10</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalXP.toLocaleString('pt-BR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Badges concedidas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBadgesEarned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missões 7d</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.missionsByDay.reduce((a, b) => a + b.count, 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Missões diárias concluídas (últimos 7 dias)</CardTitle>
          <CardDescription>Conclusões agregadas de todos os alunos.</CardDescription>
        </CardHeader>
        <CardContent style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.missionsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Top 10 alunos por XP</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-right">Nível</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topXP.map((u, i) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="truncate max-w-[180px]">{u.full_name || '—'}</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">L{u.level}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{u.total_xp.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right tabular-nums flex items-center justify-end gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />{u.current_streak ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
                {data.topXP.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados ainda.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Badges mais conquistadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge</TableHead>
                  <TableHead className="text-right">Conquistas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.badgeStats.map((b) => (
                  <TableRow key={b.badge_id}>
                    <TableCell className="flex items-center gap-2">
                      {b.icon && <span className="text-lg">{b.icon}</span>}
                      <span>{b.title}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.count}</TableCell>
                  </TableRow>
                ))}
                {data.badgeStats.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Sem dados ainda.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}