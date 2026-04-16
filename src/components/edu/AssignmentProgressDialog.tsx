import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CheckCircle2, XCircle, Clock, Hourglass, AlertTriangle, MinusCircle,
  Bell, CalendarPlus, Plus, Users, TrendingUp, Award, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useAssignmentProgress,
  useExtendDueDate,
  useGrantExtraAttempts,
  useSendAssignmentReminder,
  type StudentAssignmentStatus,
} from '@/hooks/useAssignmentProgress';

interface Props {
  assignmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_META: Record<StudentAssignmentStatus, { label: string; icon: any; cls: string }> = {
  not_started:      { label: 'Não iniciou',      icon: MinusCircle,   cls: 'bg-muted text-muted-foreground' },
  in_progress:      { label: 'Em andamento',     icon: Clock,         cls: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  pending_grading:  { label: 'Aguarda correção', icon: Hourglass,     cls: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  failed_can_retry: { label: 'Reprovado (pode refazer)', icon: AlertTriangle, cls: 'bg-orange-500/10 text-orange-700 border-orange-200' },
  exhausted:        { label: 'Esgotou tentativas', icon: XCircle,     cls: 'bg-red-500/10 text-red-700 border-red-200' },
  passed:           { label: 'Aprovado',         icon: CheckCircle2,  cls: 'bg-green-500/10 text-green-700 border-green-200' },
};

export function AssignmentProgressDialog({ assignmentId, open, onOpenChange }: Props) {
  const { data, isLoading } = useAssignmentProgress(assignmentId);
  const extend = useExtendDueDate();
  const grant = useGrantExtraAttempts();
  const remind = useSendAssignmentReminder();

  const [filter, setFilter] = useState<'all' | StudentAssignmentStatus>('all');
  const [newDueDate, setNewDueDate] = useState('');
  const [extraCount, setExtraCount] = useState(1);
  const [reminderMode, setReminderMode] = useState<'all_pending' | 'not_started' | 'not_submitted'>('all_pending');

  const filteredStudents = (data?.students ?? []).filter(s =>
    filter === 'all' ? true : s.status === filter
  );

  const handleExtend = () => {
    if (!assignmentId || !newDueDate) return;
    extend.mutate({ assignmentId, newDueDate: new Date(newDueDate).toISOString() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Acompanhamento da Atividade</DialogTitle>
          <DialogDescription>
            {data?.assignment.title || 'Carregando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card><CardContent className="pt-4 pb-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <Users className="h-3 w-3" /> Alunos
                </div>
                <p className="text-2xl font-bold">{data.kpis.total_students}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Conclusão</p>
                <p className="text-2xl font-bold">{data.kpis.completion_rate}%</p>
                <Progress value={data.kpis.completion_rate} className="h-1 mt-1" />
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <Award className="h-3 w-3" /> Aprovação
                </div>
                <p className="text-2xl font-bold text-green-600">{data.kpis.pass_rate}%</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3 w-3" /> Nota média
                </div>
                <p className="text-2xl font-bold">{data.kpis.avg_score || 0}%</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Tentativas máx</p>
                <p className="text-2xl font-bold">{data.assignment.max_attempts}</p>
                <p className="text-[10px] text-muted-foreground">Mín. {data.assignment.min_score_pct}%</p>
              </CardContent></Card>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(['not_started','in_progress','pending_grading','failed_can_retry','exhausted','passed'] as StudentAssignmentStatus[]).map(s => {
                const count = data.students.filter(x => x.status === s).length;
                const meta = STATUS_META[s];
                const Icon = meta.icon;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(filter === s ? 'all' : s)}
                    className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${
                      filter === s ? 'ring-2 ring-primary' : ''
                    } ${meta.cls}`}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}: <strong>{count}</strong>
                  </button>
                );
              })}
              {filter !== 'all' && (
                <Button size="sm" variant="ghost" onClick={() => setFilter('all')}>
                  Limpar filtro
                </Button>
              )}
            </div>

            {/* Bulk actions */}
            <div className="flex flex-wrap gap-2">
              {/* Reminder */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Bell className="h-4 w-4 mr-2" />Enviar lembrete
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-3">
                  <Label className="text-xs">Enviar para:</Label>
                  <Select value={reminderMode} onValueChange={(v: any) => setReminderMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_pending">Todos pendentes</SelectItem>
                      <SelectItem value="not_started">Quem não iniciou</SelectItem>
                      <SelectItem value="not_submitted">Quem não entregou</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={remind.isPending || !assignmentId}
                    onClick={() => assignmentId && remind.mutate({ assignmentId, mode: reminderMode })}
                  >
                    {remind.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar lembrete
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Extend due date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <CalendarPlus className="h-4 w-4 mr-2" />Prorrogar prazo
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-3">
                  <Label className="text-xs">Novo prazo</Label>
                  <Input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                  {data.assignment.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Atual: {format(new Date(data.assignment.due_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={extend.isPending || !newDueDate}
                    onClick={handleExtend}
                  >
                    {extend.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Prorrogar
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Extra attempts */}
              {data.assignment.assignment_type === 'exam' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />Tentativas extras
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 space-y-3">
                    <Label className="text-xs">Quantas tentativas extras adicionar</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={extraCount}
                      onChange={(e) => setExtraCount(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Aplica a todos os alunos da atividade. Atual: {data.assignment.max_attempts}
                    </p>
                    <Button
                      className="w-full"
                      size="sm"
                      disabled={grant.isPending || !assignmentId}
                      onClick={() => assignmentId && grant.mutate({ assignmentId, extraCount })}
                    >
                      {grant.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Liberar
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Students table */}
            <Card>
              <CardContent className="p-0">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">
                    Nenhum aluno {filter !== 'all' ? 'neste status' : 'atribuído'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Melhor nota</TableHead>
                        <TableHead>Última entrega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map(s => {
                        const meta = STATUS_META[s.status];
                        const Icon = meta.icon;
                        return (
                          <TableRow key={s.student_id}>
                            <TableCell className="font-medium">{s.student_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${meta.cls} text-xs`}>
                                <Icon className="h-3 w-3 mr-1" />
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.attempts_made} / {s.max_attempts}
                            </TableCell>
                            <TableCell>
                              {s.best_score != null ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{Number(s.best_score).toFixed(0)}%</span>
                                  <Progress value={Number(s.best_score)} className="w-12 h-1.5" />
                                </div>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {s.last_submitted_at
                                ? format(new Date(s.last_submitted_at), 'dd/MM/yy HH:mm')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
