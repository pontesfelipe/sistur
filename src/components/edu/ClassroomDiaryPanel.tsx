import { getDateLocale } from '@/i18n/dateLocale';
import { tx } from '@/i18n/t';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BookCheck, Clock, AlertTriangle, Users, Download, Activity } from 'lucide-react';
import { useClassroomDiary, diaryStats, type DiaryRow } from '@/hooks/useClassroomDiary';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmtMinutes(min: number) {
  if (!min) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

function statusBadge(r: DiaryRow) {
  if (r.fraud_flags > 0) return <Badge variant="destructive">{tx('Alerta')}</Badge>;
  if (!r.last_seen_at) return <Badge variant="outline">{tx('Sem acesso')}</Badge>;
  const days = (Date.now() - new Date(r.last_seen_at).getTime()) / 86400000;
  if (days <= 7) return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">{tx('Ativo')}</Badge>;
  if (days <= 30) return <Badge variant="secondary">{tx('Inativo recente')}</Badge>;
  return <Badge variant="outline">Inativo &gt; 30d</Badge>;
}

function exportCsv(rows: DiaryRow[], classroomName: string) {
  const header = ['Aluno','Matrícula','Sessões','Dias Presença','Tempo Ativo (min)','Última Atividade','Atividades Concluídas','Atividades Totais','Melhor Nota','Tentativas','Alertas'];
  const lines = [header.join(';')].concat(
    rows.map(r => [
      r.student_name,
      r.enrolled_at ? format(new Date(r.enrolled_at), 'dd/MM/yyyy') : '',
      r.total_sessions, r.attendance_days, r.total_active_minutes,
      r.last_seen_at ? format(new Date(r.last_seen_at), 'dd/MM/yyyy HH:mm') : '',
      r.assignments_completed, r.assignments_total,
      r.best_exam_score != null ? Number(r.best_exam_score).toFixed(1) : '',
      r.exam_attempts, r.fraud_flags,
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(';'))
  );
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diario-${classroomName || 'sala'}-${format(new Date(),'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  classroomId: string;
  classroomName?: string;
}

export function ClassroomDiaryPanel({ classroomId, classroomName }: Props) {
  const { data: rows, isLoading } = useClassroomDiary(classroomId);
  const list = rows ?? [];
  const stats = diaryStats(list);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookCheck className="h-5 w-5" /> {tx("Diário de Classe")}
          </CardTitle>
          <CardDescription>
            {tx('Presença, progresso em atividades e desempenho em provas — consolidado por aluno.')}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(list, classroomName || '')} disabled={!list.length}>
          <Download className="h-4 w-4 mr-2" /> {tx("Exportar CSV")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat icon={<Users className="h-4 w-4" />} label={tx('Alunos')} value={String(stats.totalAlunos)} />
          <Stat icon={<Activity className="h-4 w-4" />} label={tx('Ativos (7d)')} value={String(stats.ativos7d)} />
          <Stat icon={<Clock className="h-4 w-4" />} label={tx('Conclusão média')} value={`${stats.taxaConclusaoMedia.toFixed(0)}%`} />
          <Stat icon={<BookCheck className="h-4 w-4" />} label={tx('Nota média')} value={stats.mediaNota != null ? `${stats.mediaNota.toFixed(1)}%` : '—'} />
          <Stat icon={<AlertTriangle className="h-4 w-4" />} label={tx('Alertas')} value={String(stats.alertas)} highlight={stats.alertas > 0} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !list.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{tx('Sem alunos matriculados nesta sala.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx('Aluno')}</TableHead>
                  <TableHead>{tx('Status')}</TableHead>
                  <TableHead className="text-right">{tx('Presença')}</TableHead>
                  <TableHead className="text-right">{tx('Tempo ativo')}</TableHead>
                  <TableHead className="text-right">{tx('Atividades')}</TableHead>
                  <TableHead className="text-right">{tx('Nota')}</TableHead>
                  <TableHead>{tx('Última atividade')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(r => (
                  <TableRow key={r.student_id}>
                    <TableCell>
                      <div className="font-medium">{r.student_name}</div>
                      {r.fraud_flags > 0 && (
                        <div className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" /> {tx("{{v0}} alerta(s) pendente(s)", { v0: r.fraud_flags })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {tx("{{v0}} dia(s)", { v0: r.attendance_days })}
                      <div className="text-xs text-muted-foreground">{tx("{{v0}} sessões", { v0: r.total_sessions })}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtMinutes(r.total_active_minutes)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {r.assignments_completed}/{r.assignments_total}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.best_exam_score != null ? (
                        <>
                          <span className="font-medium">{Number(r.best_exam_score).toFixed(1)}%</span>
                          <div className="text-xs text-muted-foreground">{tx("{{v0}} tentativa(s)", { v0: r.exam_attempts })}</div>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.last_seen_at
                        ? formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true, locale: getDateLocale() })
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

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-destructive/40 bg-destructive/5' : ''}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}