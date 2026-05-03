import { useMemo } from 'react';
import { useClassrooms } from '@/hooks/useClassrooms';
import { useClassroomDiary, diaryStats, type DiaryRow } from '@/hooks/useClassroomDiary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, Users, Award, BarChart3, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClassroomBlockProps {
  classroomId: string;
  classroomName: string;
}

function ClassroomBlock({ classroomId, classroomName }: ClassroomBlockProps) {
  const { data: rows, isLoading } = useClassroomDiary(classroomId);
  const stats = useMemo(() => diaryStats(rows ?? []), [rows]);

  // Risco: aluno sem atividade há 14d, conclusão <30%, ou fraude pendente
  const atRisk: DiaryRow[] = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    return rows.filter((r) => {
      const stale = !r.last_seen_at || (now - new Date(r.last_seen_at).getTime()) > 14 * 86400000;
      const lowCompletion =
        r.assignments_total > 0 && r.assignments_completed / r.assignments_total < 0.3;
      const flagged = (r.fraud_flags || 0) > 0;
      return stale || lowCompletion || flagged;
    });
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {classroomName}
        </CardTitle>
        <CardDescription>
          {stats.totalAlunos} alunos · {stats.ativos7d} ativos (7d)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> Conclusão média
                </div>
                <div className="text-lg font-semibold mt-1">{stats.taxaConclusaoMedia.toFixed(0)}%</div>
                <Progress value={stats.taxaConclusaoMedia} className="h-1.5 mt-1" />
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Award className="h-3 w-3" /> Nota média
                </div>
                <div className="text-lg font-semibold mt-1">
                  {stats.mediaNota != null ? `${stats.mediaNota.toFixed(0)}%` : '—'}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" /> Ativos 7d
                </div>
                <div className="text-lg font-semibold mt-1">{stats.ativos7d}</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" /> Em risco
                </div>
                <div className="text-lg font-semibold mt-1 text-destructive">{atRisk.length}</div>
              </div>
            </div>

            {atRisk.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Alunos em risco ({atRisk.length})
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Conclusão</TableHead>
                        <TableHead>Última atividade</TableHead>
                        <TableHead>Alertas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atRisk.slice(0, 10).map((r) => {
                        const pct = r.assignments_total > 0
                          ? Math.round((r.assignments_completed / r.assignments_total) * 100)
                          : 0;
                        return (
                          <TableRow key={r.student_id}>
                            <TableCell className="font-medium">{r.student_name}</TableCell>
                            <TableCell>
                              <Badge variant={pct < 30 ? 'destructive' : 'secondary'}>{pct}%</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.last_seen_at
                                ? new Date(r.last_seen_at).toLocaleDateString('pt-BR')
                                : '— nunca acessou'}
                            </TableCell>
                            <TableCell>
                              {r.fraud_flags > 0 && (
                                <Badge variant="destructive">{r.fraud_flags} fraude</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfessorAnalyticsPanel() {
  const { classrooms, isLoading } = useClassrooms();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  if (!classrooms?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Crie uma sala para começar a ver métricas dos seus alunos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Analytics por Turma</h3>
        <p className="text-sm text-muted-foreground">
          Progresso, frequência e identificação automática de alunos em risco.
        </p>
      </div>
      <div className="space-y-4">
        {classrooms.map((c) => (
          <ClassroomBlock key={c.id} classroomId={c.id} classroomName={c.name} />
        ))}
      </div>
    </div>
  );
}