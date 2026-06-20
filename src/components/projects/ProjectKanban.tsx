import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ProjectTask,
  TaskStatus,
  TASK_STATUS_INFO,
  PRIORITY_INFO,
  useUpdateTask,
} from '@/hooks/useProjects';
import { GripVertical, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done', 'blocked'];

/**
 * Native HTML5 drag-and-drop Kanban for project tasks. Avoids extra deps.
 * Each column is a drop zone; cards carry the task id via dataTransfer.
 * On drop we patch status via useUpdateTask — the query invalidation in the
 * hook auto-refreshes the board.
 */
export function ProjectKanban({ tasks, onEdit }: { tasks: ProjectTask[]; onEdit?: (task: ProjectTask) => void }) {
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<TaskStatus | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, ProjectTask[]>();
    COLUMNS.forEach((c) => map.set(c, []));
    tasks.forEach((t) => {
      const col = COLUMNS.includes(t.status) ? t.status : 'backlog';
      map.get(col)!.push(t);
    });
    return map;
  }, [tasks]);

  const handleDrop = async (status: TaskStatus, taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) {
      setDraggingId(null);
      setHoverCol(null);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: taskId, updates: { status } });
      toast({ title: 'Tarefa movida', description: `→ ${TASK_STATUS_INFO[status].label}` });
    } catch (err: any) {
      toast({ title: 'Erro ao mover tarefa', description: err.message, variant: 'destructive' });
    } finally {
      setDraggingId(null);
      setHoverCol(null);
    }
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map((status) => {
          const info = TASK_STATUS_INFO[status];
          const items = byStatus.get(status) || [];
          const isHover = hoverCol === status;
          return (
            <div
              key={status}
              className={cn(
                'w-72 shrink-0 rounded-lg border bg-muted/30 flex flex-col',
                isHover && 'ring-2 ring-primary bg-primary/5',
              )}
              onDragOver={(e) => { e.preventDefault(); setHoverCol(status); }}
              onDragLeave={() => setHoverCol((c) => (c === status ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) handleDrop(status, id);
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', info.color)} />
                  <span className="text-sm font-medium">{info.label}</span>
                </div>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>
              <div className="p-2 space-y-2 min-h-[160px] max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Solte tarefas aqui
                  </p>
                ) : (
                  items.map((task) => {
                    const pinfo = PRIORITY_INFO[task.priority];
                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingId(task.id);
                        }}
                        onDragEnd={() => { setDraggingId(null); setHoverCol(null); }}
                        onClick={() => onEdit?.(task)}
                        className={cn(
                          'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
                          draggingId === task.id && 'opacity-50',
                        )}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
                            <p className="text-sm font-medium leading-snug line-clamp-3">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap pl-5">
                            <Badge variant="secondary" className={cn('text-[10px] text-white', pinfo.color)}>
                              {pinfo.label}
                            </Badge>
                            {task.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                            ))}
                            {task.linked_issue_id && (
                              <Badge variant="outline" className="text-[10px] gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> gargalo
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}