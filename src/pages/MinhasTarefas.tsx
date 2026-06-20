import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, ExternalLink, CalendarDays } from 'lucide-react';
import { useMyTasks } from '@/hooks/useProjectCollab';
import { TASK_STATUS_INFO, PRIORITY_INFO } from '@/hooks/useProjects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function MinhasTarefas() {
  const { data: tasks = [], isLoading } = useMyTasks();

  const groups = {
    em_andamento: tasks.filter((t: any) => ['todo', 'in_progress', 'review'].includes(t.status)),
    bloqueadas:   tasks.filter((t: any) => t.status === 'blocked'),
    concluidas:   tasks.filter((t: any) => t.status === 'done'),
    outras:       tasks.filter((t: any) => !['todo','in_progress','review','blocked','done'].includes(t.status)),
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <ListChecks className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Minhas tarefas</h1>
            <p className="text-sm text-muted-foreground">
              Tarefas em que você é responsável ou aprovador, em todos os projetos da sua organização.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Você ainda não tem tarefas atribuídas.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <TaskGroup title="Em andamento" tasks={groups.em_andamento} />
            {groups.bloqueadas.length > 0 && <TaskGroup title="Bloqueadas" tasks={groups.bloqueadas} />}
            {groups.outras.length > 0 && <TaskGroup title="Outras" tasks={groups.outras} />}
            {groups.concluidas.length > 0 && <TaskGroup title="Concluídas" tasks={groups.concluidas} collapsed />}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function TaskGroup({ title, tasks, collapsed }: { title: string; tasks: any[]; collapsed?: boolean }) {
  if (!tasks.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {title}
          <Badge variant="outline">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((t) => {
          const sInfo = TASK_STATUS_INFO[t.status as keyof typeof TASK_STATUS_INFO];
          const pInfo = PRIORITY_INFO[t.priority as keyof typeof PRIORITY_INFO];
          const overdue = t.planned_end_date && new Date(t.planned_end_date) < new Date() && t.status !== 'done';
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition',
                collapsed && 'opacity-70'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{t.project?.name || 'Projeto'}</span>
                  {t.planned_end_date && (
                    <span className={cn('flex items-center gap-1', overdue && 'text-destructive font-medium')}>
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(t.planned_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {overdue && ' (atrasada)'}
                    </span>
                  )}
                </p>
              </div>
              {sInfo && (
                <Badge variant="secondary" className="text-[10px]">{sInfo.label}</Badge>
              )}
              {pInfo && (
                <Badge className={cn('text-[10px] text-white', pInfo.color)}>{pInfo.label}</Badge>
              )}
              <Button asChild size="sm" variant="ghost">
                <Link to={`/projetos?project=${t.project_id}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}