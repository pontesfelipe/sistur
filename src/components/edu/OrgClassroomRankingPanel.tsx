import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, AlertTriangle } from 'lucide-react';
import { useOrgClassroomRanking } from '@/hooks/useClassroomOverview';

export function OrgClassroomRankingPanel() {
  const { data, isLoading } = useOrgClassroomRanking();
  const rows = data ?? [];

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" /> Ranking de Turmas
        </CardTitle>
        <CardDescription>
          Comparativo entre todas as turmas ativas da organização, ordenadas por XP médio. Inclui taxa de conclusão e alunos em risco para apoiar decisões pedagógicas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma turma ativa para comparar.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead className="text-right">Alunos</TableHead>
                  <TableHead className="text-right">XP médio</TableHead>
                  <TableHead className="text-right">Streaks</TableHead>
                  <TableHead className="text-right">Em risco</TableHead>
                  <TableHead className="text-right">Conclusão</TableHead>
                  <TableHead className="text-right">Nota média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.classroom_id}>
                    <TableCell>
                      {r.rank <= 3 ? (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                          {r.rank}º
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">{r.rank}º</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.classroom_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.professor_name}</TableCell>
                    <TableCell className="text-right">{r.students_count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {Math.round(Number(r.avg_total_xp ?? 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-500" /> {r.active_streaks}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.at_risk_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {r.at_risk_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{Number(r.completion_rate ?? 0)}%</TableCell>
                    <TableCell className="text-right">
                      {Number(r.avg_exam_score ?? 0) > 0
                        ? `${Number(r.avg_exam_score).toFixed(1)}%`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}