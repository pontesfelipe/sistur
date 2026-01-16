import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateTask,
  useUpdateTask,
  ProjectTask,
  ProjectPhase,
  TaskStatus,
  TaskType,
  TaskPriority,
  TASK_STATUS_INFO,
  PRIORITY_INFO,
} from '@/hooks/useProjects';
import { Loader2 } from 'lucide-react';

interface TaskFormDialogProps {
  projectId: string;
  phases: ProjectPhase[];
  task?: ProjectTask | null;
  defaultPhaseId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'task', label: 'Tarefa' },
  { value: 'feature', label: 'Funcionalidade' },
  { value: 'story', label: 'História' },
  { value: 'epic', label: 'Épico' },
  { value: 'bug', label: 'Bug' },
  { value: 'milestone', label: 'Marco' },
];

export function TaskFormDialog({
  projectId,
  phases,
  task,
  defaultPhaseId,
  open,
  onOpenChange,
}: TaskFormDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phaseId, setPhaseId] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeName, setAssigneeName] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPhaseId(task.phase_id || '');
      setTaskType(task.task_type);
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeName(task.assignee_name || '');
      setEstimatedHours(task.estimated_hours?.toString() || '');
      setStoryPoints(task.story_points?.toString() || '');
      setPlannedStartDate(task.planned_start_date?.split('T')[0] || '');
      setPlannedEndDate(task.planned_end_date?.split('T')[0] || '');
    } else {
      setTitle('');
      setDescription('');
      setPhaseId(defaultPhaseId || '');
      setTaskType('task');
      setStatus('todo');
      setPriority('medium');
      setAssigneeName('');
      setEstimatedHours('');
      setStoryPoints('');
      setPlannedStartDate('');
      setPlannedEndDate('');
    }
  }, [task, defaultPhaseId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      title,
      description: description || null,
      phase_id: phaseId || null,
      task_type: taskType,
      status,
      priority,
      assignee_name: assigneeName || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      story_points: storyPoints ? parseInt(storyPoints) : null,
      planned_start_date: plannedStartDate || null,
      planned_end_date: plannedEndDate || null,
    };

    if (isEditing && task) {
      await updateTask.mutateAsync({
        id: task.id,
        updates: taskData,
      });
    } else {
      await createTask.mutateAsync({
        project_id: projectId,
        parent_task_id: null,
        assignee_id: null,
        actual_hours: null,
        actual_start_date: null,
        actual_end_date: null,
        linked_issue_id: null,
        linked_prescription_id: null,
        linked_action_plan_id: null,
        tags: [],
        ...taskData,
      });
    }

    onOpenChange(false);
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações da tarefa' : 'Adicione uma nova tarefa ao projeto'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da tarefa"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={phaseId} onValueChange={setPhaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem fase</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee">Responsável</Label>
            <Input
              id="task-assignee"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-hours">Horas Estimadas</Label>
              <Input
                id="task-hours"
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-points">Story Points</Label>
              <Input
                id="task-points"
                type="number"
                min={0}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-start">Data de Início</Label>
              <Input
                id="task-start"
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-end">Data de Término</Label>
              <Input
                id="task-end"
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !title}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
