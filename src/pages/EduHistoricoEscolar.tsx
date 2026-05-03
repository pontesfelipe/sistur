import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { eduAvaliacoesNav } from '@/components/layout/eduSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, BookOpen, CheckCircle2, Clock, GraduationCap, ExternalLink } from 'lucide-react';
import { useStudentTranscript, transcriptStats } from '@/hooks/useStudentTranscript';

function statusBadge(status: string) {
  if (status === 'concluido')
    return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
  if (status === 'em_andamento')
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Em andamento</Badge>;
  return <Badge variant="outline">Não iniciado</Badge>;
}

export default function EduHistoricoEscolar() {
  const { data, isLoading } = useStudentTranscript();
  const rows = data ?? [];
  const stats = transcriptStats(rows);

  return (
    <AppLayout subNav={eduAvaliacoesNav}
      title="Histórico Escolar"
      subtitle="Boletim consolidado dos seus cursos, exames e certificados"
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Cursos</p>
                <p className="text-2xl font-bold">{stats.totalCursos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.concluidos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Em andamento</p>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Carga horária</p>
                <p className="text-2xl font-bold">{stats.totalHoras}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Média ponderada</p>
                <p className="text-2xl font-bold">
                  {stats.mediaPonderada !== null ? `${stats.mediaPonderada.toFixed(1)}%` : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Boletim Detalhado
              </CardTitle>
              <CardDescription>
                Lista de todos os cursos cursados, com nota, carga horária e certificados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p className="font-medium">Nenhuma atividade registrada ainda</p>
                  <p className="text-sm mt-1">Comece por explorar o catálogo de cursos.</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/edu/catalogo">Ir ao catálogo</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead>Pilar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Progresso</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                        <TableHead className="text-right">Tentativas</TableHead>
                        <TableHead>Certificado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(r => (
                        <TableRow key={r.training_id}>
                          <TableCell className="max-w-xs">
                            <div className="font-medium truncate" title={r.course_title}>{r.course_title}</div>
                            {r.curriculum_level && (
                              <span className="text-xs text-muted-foreground">Nível {r.curriculum_level}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.pillar}</Badge>
                          </TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-right">{r.progress_percent}%</TableCell>
                          <TableCell className="text-right">
                            {r.best_score !== null ? `${Number(r.best_score).toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="text-right">{r.attempts_count}</TableCell>
                          <TableCell>
                            {r.certificate_id ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                <Award className="h-3 w-3 mr-1" />Emitido
                              </Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <Button asChild size="sm" variant="ghost">
                              <Link to={`/edu/training/${r.training_id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}