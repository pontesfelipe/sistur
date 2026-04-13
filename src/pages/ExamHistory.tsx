import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Award,
  History,
  BarChart3,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useExamHistory, useExamAppeals, useExamAppealMutations } from '@/hooks/useExamHistory';

const ExamHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appealDialog, setAppealDialog] = useState<{ attemptId: string; courseName: string } | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const { data: attempts, isLoading } = useExamHistory();
  const { data: appeals, isLoading: appealsLoading } = useExamAppeals();
  const { createAppeal } = useExamAppealMutations();

  const filteredAttempts = attempts?.filter(a => {
    if (statusFilter === 'all') return true;
    return a.result === statusFilter;
  }) || [];

  const stats = {
    total: attempts?.length || 0,
    passed: attempts?.filter(a => a.result === 'passed').length || 0,
    failed: attempts?.filter(a => a.result === 'failed').length || 0,
    pending: attempts?.filter(a => a.result === 'pending').length || 0,
    avgScore: attempts?.length 
      ? Math.round(attempts.reduce((s, a) => s + (a.score_pct || 0), 0) / attempts.length) 
      : 0,
  };

  const handleSubmitAppeal = async () => {
    if (!appealDialog || !appealReason.trim()) return;
    try {
      await createAppeal.mutateAsync({
        attemptId: appealDialog.attemptId,
        reason: appealReason,
      });
      setAppealDialog(null);
      setAppealReason('');
      toast.success('Recurso enviado com sucesso!');
    } catch {
      toast.error('Erro ao enviar recurso');
    }
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'passed':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Reprovado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Aguardando Correção</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  const getAppealStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Aceito</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Histórico de Provas" subtitle="Consulte seus resultados e gerencie recursos">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de Provas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
            <p className="text-xs text-muted-foreground">Aprovações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Reprovações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
            <p className="text-xs text-muted-foreground">Média Geral</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="appeals" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Recursos ({appeals?.filter(a => a.status === 'pending').length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="passed">Aprovado</SelectItem>
                <SelectItem value="failed">Reprovado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredAttempts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma prova realizada</p>
                  <Button variant="link" onClick={() => navigate('/edu')}>
                    Ir ao Catálogo EDU
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Curso / Prova</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttempts.map((attempt) => (
                      <TableRow key={attempt.attempt_id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {attempt.course_title || 'Prova'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {attempt.submitted_at 
                            ? new Date(attempt.submitted_at).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : attempt.started_at 
                              ? new Date(attempt.started_at).toLocaleDateString('pt-BR')
                              : '—'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{(attempt.score_pct || 0).toFixed(0)}%</span>
                            <Progress value={attempt.score_pct || 0} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>{getResultBadge(attempt.result)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {attempt.grading_mode === 'automatic' ? 'Auto' : attempt.grading_mode === 'hybrid' ? 'Híbrido' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/edu/exam-review/${attempt.attempt_id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Revisar
                            </Button>
                            {(attempt.result === 'failed' || attempt.result === 'passed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAppealDialog({
                                  attemptId: attempt.attempt_id,
                                  courseName: attempt.course_title || 'Prova',
                                })}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Recurso
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {appealsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !appeals?.length ? (
                <div className="p-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum recurso enviado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data do Recurso</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resposta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appeals.map((appeal) => (
                      <TableRow key={appeal.id}>
                        <TableCell className="text-sm">
                          {new Date(appeal.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm line-clamp-2">{appeal.reason}</p>
                        </TableCell>
                        <TableCell>{getAppealStatusBadge(appeal.status)}</TableCell>
                        <TableCell className="max-w-xs">
                          {appeal.admin_response ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">{appeal.admin_response}</p>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Aguardando</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Appeal Dialog */}
      <AlertDialog open={!!appealDialog} onOpenChange={(open) => !open && setAppealDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Recurso</AlertDialogTitle>
            <AlertDialogDescription>
              Questione o resultado da prova "{appealDialog?.courseName}". 
              Descreva os motivos do recurso de forma clara e objetiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="appeal-reason">Motivo do recurso</Label>
            <Textarea
              id="appeal-reason"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Descreva por que discorda do resultado..."
              rows={5}
            />
            {appealReason.length > 0 && appealReason.length < 20 && (
              <p className="text-xs text-severity-moderate">Mínimo de 20 caracteres</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitAppeal}
              disabled={appealReason.length < 20 || createAppeal.isPending}
            >
              {createAppeal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar Recurso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ExamHistory;
