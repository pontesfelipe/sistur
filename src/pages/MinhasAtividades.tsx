import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyClassroomAssignments, useStartAssignmentExam, type StudentAssignment } from '@/hooks/useStudentAssignments';
import { ClipboardList, Calendar, Clock, Lock, AlertTriangle, CheckCircle2, BookOpen, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const REASON_MSG: Record<string, string> = {
  not_yet_open: 'Esta atividade ainda não foi liberada.',
  past_due: 'O prazo desta atividade já encerrou.',
  max_attempts_reached: 'Você atingiu o número máximo de tentativas.',
  not_targeted: 'Esta atividade não foi atribuída a você.',
  not_enrolled: 'Você não está matriculado nesta turma.',
  assignment_not_found: 'Atividade não encontrada.',
  not_authenticated: 'Faça login para continuar.',
};

function AssignmentRow({ a }: { a: StudentAssignment }) {
  const navigate = useNavigate();
  const startExam = useStartAssignmentExam();

  const Icon = a.assignment_type === 'exam' ? ClipboardList
    : a.assignment_type === 'track' ? BookOpen
    : a.assignment_type === 'training' ? GraduationCap
    : ClipboardList;

  const blocked = !a.is_open || a.is_overdue;
  const opensAt = a.available_from ? new Date(a.available_from) : null;
  const dueAt = a.due_date ? new Date(a.due_date) : null;

  const handleStart = async () => {
    if (a.assignment_type !== 'exam') {
      if (a.assignment_type === 'track' && a.track_id) navigate(`/edu/trilhas/${a.track_id}`);
      else if (a.assignment_type === 'training' && a.training_id) navigate(`/edu/training/${a.training_id}`);
      return;
    }
    try {
      const res = await startExam.mutateAsync(a.id);
      if (!res.allowed || !res.exam_id) {
        toast.error(REASON_MSG[res.reason || ''] || 'Não é possível iniciar agora');
        return;
      }
      toast.success('Prova iniciada!');
      navigate(`/edu/exam/${res.exam_id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao iniciar a prova');
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 p-4 border rounded-lg">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{a.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {a.classroom_name}{a.professor_name ? ` · ${a.professor_name}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {a.assignment_type === 'exam' ? 'Prova' : a.assignment_type === 'track' ? 'Trilha' : a.assignment_type === 'training' ? 'Treinamento' : 'Atividade'}
            </Badge>
            {opensAt && opensAt > new Date() && (
              <span className="text-xs text-warning flex items-center gap-1">
                <Lock className="h-3 w-3" /> Abre {format(opensAt, 'dd/MM HH:mm')}
              </span>
            )}
            {dueAt && (
              <span className={`text-xs flex items-center gap-1 ${a.is_overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Calendar className="h-3 w-3" /> Entrega {format(dueAt, 'dd/MM HH:mm')}
              </span>
            )}
            {a.assignment_type === 'exam' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {a.attempts_made} tentativa(s)
              </span>
            )}
            {a.last_attempt_result === 'passed' && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" /> Aprovado
              </Badge>
            )}
            {a.last_attempt_result === 'failed' && (
              <Badge variant="outline" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Reprovado
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant={blocked ? 'outline' : 'default'}
        disabled={blocked || startExam.isPending}
        onClick={handleStart}
      >
        {a.is_overdue ? 'Encerrada' : !a.is_open ? 'Aguardando' : a.assignment_type === 'exam' ? 'Iniciar' : 'Acessar'}
      </Button>
    </div>
  );
}

export default function MinhasAtividades() {
  const { data, isLoading } = useMyClassroomAssignments();

  return (
    <AppLayout title="Minhas Atividades">
      <div className="container max-w-4xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Minhas Atividades</h1>
          <p className="text-muted-foreground mt-1">
            Provas, trilhas e treinamentos atribuídos pelos seus professores
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Atribuições
            </CardTitle>
            <CardDescription>
              Atividades aparecem aqui assim que o professor as cria. Provas só podem ser iniciadas dentro da janela de disponibilidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : !data?.length ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma atividade atribuída"
                description="Quando um professor atribuir provas, trilhas ou treinamentos, eles aparecerão aqui."
              />
            ) : (
              <div className="space-y-3">
                {data.map(a => <AssignmentRow key={a.id} a={a} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
