import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Flame, AlertTriangle, Trophy, Target, BarChart3 } from 'lucide-react';
import { useProfessorClassroomOverview } from '@/hooks/useClassroomOverview';

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent ?? 'bg-primary/10 text-primary'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfessorOverviewPanel() {
  const { data, isLoading } = useProfessorClassroomOverview();
  const rows = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => ({
      students: acc.students + (r.students_count ?? 0),
      streaks: acc.streaks + (r.active_streaks ?? 0),
      atRisk: acc.atRisk + (r.at_risk_count ?? 0),
      xpSum: acc.xpSum + Number(r.avg_total_xp ?? 0) * (r.students_count ?? 0),
    }),
    { students: 0, streaks: 0, atRisk: 0, xpSum: 0 }
  );
  const avgXp = totals.students > 0 ? Math.round(totals.xpSum / totals.students) : 0;
  const avgScore =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + Number(r.avg_exam_score ?? 0), 0) / rows.length) * 10) / 10
      : 0;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto opacity-30 mb-3" />
          <p className="font-medium">Nenhuma turma ativa ainda</p>
          <p className="text-sm">Crie uma turma para visualizar métricas agregadas aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Users} label="Alunos no total" value={String(totals.students)} />
        <Stat icon={Trophy} label="XP médio" value={String(avgXp)} accent="bg-amber-500/10 text-amber-600" />
        <Stat icon={Flame} label="Streaks ativos" value={String(totals.streaks)} accent="bg-orange-500/10 text-orange-600" />
        <Stat icon={AlertTriangle} label="Alunos em risco" value={String(totals.atRisk)} accent="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" /> Visão geral por turma
          </CardTitle>
          <CardDescription>
            Métricas consolidadas de cada turma sob sua responsabilidade — XP, engajamento e desempenho médio em provas (média geral: {avgScore}%).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
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
                    <TableCell className="font-medium">{r.classroom_name}</TableCell>
                    <TableCell className="text-right">{r.students_count}</TableCell>
                    <TableCell className="text-right">{Math.round(Number(r.avg_total_xp ?? 0))}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        {r.active_streaks}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.at_risk_count > 0 ? (
                        <Badge variant="destructive">{r.at_risk_count}</Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}