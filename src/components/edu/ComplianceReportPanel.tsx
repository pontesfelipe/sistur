/**
 * SISTUR EDU - Compliance & Anti-Fraud Report Panel
 * Shows session tracking, interaction logs, and fraud flags per student.
 * Designed for AVA compliance (MEC/certification readiness).
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Shield, AlertTriangle, Clock, Activity, Eye,
  CheckCircle, XCircle, Search, Monitor, MousePointer,
  Loader2, BarChart3, UserX, Wifi,
} from 'lucide-react';
import {
  useStudentSessions,
  useSessionInteractions,
  useFraudFlags,
  useReviewFraudFlag,
  useComplianceStats,
  type FraudFlag,
  type LearningSession,
} from '@/hooks/useEduCompliance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileNamesByIds } from '@/services/profiles';

// ─── Student Selector ───
function useStudentList() {
  return useQuery({
    queryKey: ['compliance-student-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_learning_sessions')
        .select('user_id')
        .order('started_at', { ascending: false });
      if (error) throw error;
      
      const uniqueUserIds = [...new Set((data || []).map(d => d.user_id))];
      if (uniqueUserIds.length === 0) return [];

      const profileMap = await fetchProfileNamesByIds(uniqueUserIds);

      return uniqueUserIds.map(user_id => ({
        user_id,
        full_name: profileMap.get(user_id) || 'Sem nome',
      }));
    },
  });
}

// ─── Stats Cards ───
function ComplianceStatsCards({ userId }: { userId: string }) {
  const { data: stats, isLoading } = useComplianceStats(userId);

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Monitor className="h-3.5 w-3.5" /> Sessões
          </div>
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="h-3.5 w-3.5" /> Tempo Total
          </div>
          <p className="text-2xl font-bold">{stats.totalDurationMinutes}<span className="text-sm font-normal text-muted-foreground"> min</span></p>
          <p className="text-xs text-muted-foreground">{stats.totalActiveMinutes} ativos / {stats.totalIdleMinutes} inativos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="h-3.5 w-3.5" /> Engajamento
          </div>
          <p className="text-2xl font-bold">{stats.activePercent}<span className="text-sm font-normal text-muted-foreground">%</span></p>
          <p className="text-xs text-muted-foreground">tempo ativo vs total</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas
          </div>
          <p className="text-2xl font-bold">{stats.totalFlags}</p>
          <div className="flex gap-1 mt-1">
            {stats.pendingFlags > 0 && <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">{stats.pendingFlags} pendente(s)</Badge>}
            {stats.confirmedFlags > 0 && <Badge variant="destructive" className="text-[10px]">{stats.confirmedFlags} confirmado(s)</Badge>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Session Detail Dialog ───
function SessionDetailDialog({ session, open, onClose }: { session: LearningSession | null; open: boolean; onClose: () => void }) {
  const { data: interactions, isLoading } = useSessionInteractions(session?.id);

  if (!session) return null;

  const typeLabels: Record<string, string> = {
    click: '🖱️ Clique',
    page_view: '📄 Página',
    video_play: '▶️ Play',
    video_pause: '⏸️ Pause',
    video_seek: '⏩ Seek',
    video_progress: '📊 Progresso',
    answer_select: '✅ Resposta',
    scroll: '📜 Scroll',
    focus_gain: '🔵 Foco',
    focus_loss: '🔴 Saída',
    tab_switch: '🔄 Tab',
    exam_start: '📝 Início Prova',
    exam_submit: '📤 Envio Prova',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Detalhes da Sessão
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div><span className="text-muted-foreground">Início:</span> {format(new Date(session.started_at), 'dd/MM/yyyy HH:mm:ss')}</div>
          <div><span className="text-muted-foreground">Fim:</span> {session.ended_at ? format(new Date(session.ended_at), 'dd/MM/yyyy HH:mm:ss') : 'Em andamento'}</div>
          <div><span className="text-muted-foreground">Duração:</span> {Math.round(session.duration_seconds / 60)} min</div>
          <div><span className="text-muted-foreground">Ativo:</span> {Math.round(session.active_seconds / 60)} min ({session.duration_seconds > 0 ? Math.round((session.active_seconds / session.duration_seconds) * 100) : 0}%)</div>
          <div><span className="text-muted-foreground">Tipo:</span> {session.session_type}</div>
          <div><span className="text-muted-foreground">Entidade:</span> {session.entity_type || '—'}</div>
        </div>

        <h4 className="font-medium text-sm mb-2">Log de Interações ({interactions?.length || 0})</h4>

        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Elemento</TableHead>
                  <TableHead>Página</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(interactions || []).map(i => (
                  <TableRow key={i.id} className="text-xs">
                    <TableCell className="font-mono">{format(new Date(i.timestamp), 'HH:mm:ss')}</TableCell>
                    <TableCell>{typeLabels[i.interaction_type] || i.interaction_type}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{i.element_label || i.element_id || '—'}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{i.page_url || '—'}</TableCell>
                  </TableRow>
                ))}
                {(!interactions || interactions.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma interação registrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Fraud Review Dialog ───
function FraudReviewDialog({ flag, open, onClose }: { flag: FraudFlag | null; open: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const reviewMutation = useReviewFraudFlag();

  if (!flag) return null;

  const handleReview = async (status: 'dismissed' | 'confirmed') => {
    await reviewMutation.mutateAsync({ flagId: flag.id, status, notes });
    toast.success(status === 'confirmed' ? 'Alerta confirmado' : 'Alerta descartado');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisar Alerta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{flag.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(flag.created_at), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          {flag.evidence && Object.keys(flag.evidence).length > 0 && (
            <div className="text-xs bg-muted/50 p-2 rounded font-mono">
              {JSON.stringify(flag.evidence, null, 2)}
            </div>
          )}
          <Textarea
            placeholder="Notas da revisão..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={() => handleReview('confirmed')} disabled={reviewMutation.isPending}>
              <UserX className="h-4 w-4 mr-2" /> Confirmar Fraude
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleReview('dismissed')} disabled={reviewMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" /> Descartar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Panel ───
export function ComplianceReportPanel() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<LearningSession | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<FraudFlag | null>(null);
  const [flagFilter, setFlagFilter] = useState<string>('pending');

  const { data: students, isLoading: studentsLoading } = useStudentList();
  const { data: sessions, isLoading: sessionsLoading } = useStudentSessions(selectedUserId || undefined);
  const { data: flags, isLoading: flagsLoading } = useFraudFlags({
    userId: selectedUserId || undefined,
    status: flagFilter !== 'all' ? flagFilter : undefined,
  });

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Compliance & Anti-Fraude — Relatório de Sessões
          </CardTitle>
          <CardDescription>
            Rastreamento de presença, interações e alertas automáticos para certificação AVA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">Selecionar Aluno</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {studentsLoading && <SelectItem value="_loading" disabled>Carregando...</SelectItem>}
                  {(students || []).map(s => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && <ComplianceStatsCards userId={selectedUserId} />}

      {selectedUserId && (
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions" className="gap-2">
              <Monitor className="h-4 w-4" /> Sessões
            </TabsTrigger>
            <TabsTrigger value="flags" className="gap-2">
              <AlertTriangle className="h-4 w-4" /> Alertas
              {(flags?.length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] h-5 min-w-[20px]">{flags?.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card>
              <CardContent className="pt-4">
                {sessionsLoading ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Ativo</TableHead>
                          <TableHead>Inativo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(sessions || []).map(s => {
                          const activePercent = s.duration_seconds > 0 ? Math.round((s.active_seconds / s.duration_seconds) * 100) : 0;
                          const isSuspicious = activePercent < 20 && s.duration_seconds > 600;
                          return (
                            <TableRow key={s.id} className={isSuspicious ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                              <TableCell className="text-xs font-mono">{format(new Date(s.started_at), 'dd/MM HH:mm')}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{s.session_type}</Badge></TableCell>
                              <TableCell>{Math.round(s.duration_seconds / 60)} min</TableCell>
                              <TableCell className="text-green-600">{Math.round(s.active_seconds / 60)} min</TableCell>
                              <TableCell className="text-red-500">{Math.round(s.idle_seconds / 60)} min</TableCell>
                              <TableCell>
                                {s.is_active ? (
                                  <Badge className="bg-green-500 text-[10px]"><Wifi className="h-3 w-3 mr-1" /> Online</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Encerrada</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(s)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(!sessions || sessions.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              Nenhuma sessão registrada para este aluno
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flags">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <Select value={flagFilter} onValueChange={setFlagFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="confirmed">Confirmados</SelectItem>
                      <SelectItem value="dismissed">Descartados</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {flagsLoading ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div className="space-y-3">
                    {(flags || []).map(f => (
                      <div
                        key={f.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedFlag(f)}
                      >
                        <div className={`p-1.5 rounded-full ${severityColors[f.severity] || ''}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{f.description}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{f.flag_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(f.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                        <Badge variant={f.status === 'confirmed' ? 'destructive' : f.status === 'dismissed' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                          {f.status === 'pending' ? 'Pendente' : f.status === 'confirmed' ? 'Confirmado' : f.status === 'dismissed' ? 'Descartado' : f.status}
                        </Badge>
                      </div>
                    ))}
                    {(!flags || flags.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum alerta {flagFilter !== 'all' ? flagFilter : ''} encontrado</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <SessionDetailDialog
        session={selectedSession}
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
      />
      <FraudReviewDialog
        flag={selectedFlag}
        open={!!selectedFlag}
        onClose={() => setSelectedFlag(null)}
      />
    </div>
  );
}
