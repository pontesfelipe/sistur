import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  BarChart3,
  Users,
  Loader2,
} from 'lucide-react';
import { useAllExamAttempts, useAllExamAppeals, useResolveAppeal } from '@/hooks/useExamHistory';

export function ExamManagementPanel() {
  const [activeTab, setActiveTab] = useState('attempts');
  const [resultFilter, setResultFilter] = useState('all');
  const [resolveDialog, setResolveDialog] = useState<{ id: string; action: 'accepted' | 'rejected' } | null>(null);
  const [adminResponse, setAdminResponse] = useState('');

  const { data: attempts, isLoading: attLoading } = useAllExamAttempts();
  const { data: appeals, isLoading: appLoading } = useAllExamAppeals();
  const resolveAppeal = useResolveAppeal();

  const filteredAttempts = attempts?.filter(a => {
    if (resultFilter === 'all') return true;
    return a.result === resultFilter;
  }) || [];

  const pendingAppeals = appeals?.filter(a => a.status === 'pending').length || 0;

  const stats = {
    totalAttempts: attempts?.length || 0,
    passed: attempts?.filter(a => a.result === 'passed').length || 0,
    failed: attempts?.filter(a => a.result === 'failed').length || 0,
    pending: attempts?.filter(a => a.result === 'pending').length || 0,
    avgScore: attempts?.length
      ? Math.round(attempts.reduce((s, a) => s + (a.score_pct || 0), 0) / attempts.length)
      : 0,
    passRate: attempts?.length
      ? Math.round(((attempts.filter(a => a.result === 'passed').length) / attempts.length) * 100)
      : 0,
  };

  const handleResolve = async () => {
    if (!resolveDialog) return;
    await resolveAppeal.mutateAsync({
      appealId: resolveDialog.id,
      status: resolveDialog.action,
      adminResponse,
    });
    setResolveDialog(null);
    setAdminResponse('');
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'passed': return <Badge className="bg-green-500/10 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Reprovado</Badge>;
      case 'pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      default: return <Badge variant="outline">—</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-xl font-bold">{stats.totalAttempts}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-xl font-bold text-green-600">{stats.passed}</p>
          <p className="text-[10px] text-muted-foreground">Aprovados</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-[10px] text-muted-foreground">Reprovados</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-xl font-bold">{stats.avgScore}%</p>
          <p className="text-[10px] text-muted-foreground">Média</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-xl font-bold">{stats.passRate}%</p>
          <p className="text-[10px] text-muted-foreground">Taxa Aprovação</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="attempts" className="gap-2">
            <Users className="h-4 w-4" />
            Tentativas
          </TabsTrigger>
          <TabsTrigger value="appeals" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Recursos ({pendingAppeals})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attempts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="passed">Aprovados</SelectItem>
                <SelectItem value="failed">Reprovados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {attLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !filteredAttempts.length ? (
                <div className="p-12 text-center text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tentativa encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttempts.map(a => (
                      <TableRow key={a.attempt_id}>
                        <TableCell className="font-medium">{a.user_name}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{a.course_title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{(a.score_pct || 0).toFixed(0)}%</span>
                            <Progress value={a.score_pct || 0} className="w-12 h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>{getResultBadge(a.result)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              {appLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !appeals?.length ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum recurso</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appeals.map(appeal => (
                      <TableRow key={appeal.id}>
                        <TableCell className="font-medium">{appeal.user_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(appeal.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm line-clamp-2">{appeal.reason}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={appeal.status === 'pending' ? 'secondary' : appeal.status === 'accepted' ? 'default' : 'destructive'}>
                            {appeal.status === 'pending' ? 'Pendente' : appeal.status === 'accepted' ? 'Aceito' : 'Rejeitado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {appeal.status === 'pending' && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="text-green-600"
                                onClick={() => { setResolveDialog({ id: appeal.id, action: 'accepted' }); setAdminResponse(''); }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600"
                                onClick={() => { setResolveDialog({ id: appeal.id, action: 'rejected' }); setAdminResponse(''); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {appeal.status !== 'pending' && appeal.admin_response && (
                            <p className="text-xs text-muted-foreground max-w-xs truncate">{appeal.admin_response}</p>
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

      {/* Resolve Appeal Dialog */}
      <AlertDialog open={!!resolveDialog} onOpenChange={(open) => !open && setResolveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolveDialog?.action === 'accepted' ? 'Aceitar Recurso' : 'Rejeitar Recurso'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Forneça uma resposta ao aluno sobre a decisão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <Label>Resposta</Label>
            <Textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder="Justificativa da decisão..."
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={!adminResponse.trim() || resolveAppeal.isPending}
              className={resolveDialog?.action === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {resolveAppeal.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {resolveDialog?.action === 'accepted' ? 'Aceitar' : 'Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
