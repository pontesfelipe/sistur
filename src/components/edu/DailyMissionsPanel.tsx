import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, CheckCircle2, Sparkles } from 'lucide-react';
import { useDailyMissions } from '@/hooks/useDailyMissions';

export function DailyMissionsPanel() {
  const { data: missions, isLoading } = useDailyMissions();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Missões diárias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const list = missions ?? [];
  const completed = list.filter((m) => m.completed_at).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Missões diárias
            </CardTitle>
            <CardDescription>3 desafios novos a cada dia. Concluídos: {completed}/{list.length}</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Bônus XP
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma missão para hoje. Volte amanhã!</p>
        )}
        {list.map((m) => {
          const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
          const done = !!m.completed_at;
          return (
            <div key={m.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>
                      {m.title}
                    </p>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">{m.description}</p>
                  )}
                </div>
                <Badge variant={done ? 'default' : 'outline'}>+{m.xp_reward} XP</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                  {m.progress}/{m.target}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}