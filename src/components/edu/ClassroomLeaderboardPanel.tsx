import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award } from 'lucide-react';
import {
  useClassroomLeaderboard,
  useMyLeaderboardOptIn,
  useToggleLeaderboardOptIn,
} from '@/hooks/useClassroomLeaderboard';

interface Props {
  classroomId: string;
  /** Quando true, mostra o switch de opt-in para o aluno. */
  showOptInToggle?: boolean;
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-orange-500" />;
  return <Award className="h-4 w-4 text-muted-foreground" />;
};

export function ClassroomLeaderboardPanel({ classroomId, showOptInToggle = true }: Props) {
  const { data: rows, isLoading } = useClassroomLeaderboard(classroomId);
  const { data: optIn } = useMyLeaderboardOptIn(classroomId);
  const toggle = useToggleLeaderboardOptIn();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Placar semanal
            </CardTitle>
            <CardDescription>XP ganho nos últimos 7 dias — apenas alunos que optaram aparecem.</CardDescription>
          </div>
          {showOptInToggle && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`optin-${classroomId}`} className="text-xs">
                Participar
              </Label>
              <Switch
                id={`optin-${classroomId}`}
                checked={!!optIn}
                disabled={toggle.isPending}
                onCheckedChange={(v) =>
                  toggle.mutate({ classroom_id: classroomId, opt_in: v })
                }
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum aluno opt-in ainda. Ative a participação para começar.
          </p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div
                key={r.user_id}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50"
              >
                <div className="w-7 flex justify-center">{rankIcon(r.rank)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.rank}. {r.display_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Nível {r.level} · {r.total_xp} XP totais
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono">
                  +{r.xp_week} XP
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}