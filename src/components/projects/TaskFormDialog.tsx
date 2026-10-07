import { tx } from '@/i18n/t';
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
  type ChecklistItem,
} from '@/hooks/useProjects';
import { Loader2 } from 'lucide-react';
import { TaskAssigneeCombobox } from './TaskAssigneeCombobox';
import { TaskCollaborationPanel } from './TaskCollaborationPanel';
import { useMyProjectRole } from '@/hooks/useProjectCollab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskFormDialogProps {
  projectId: string;
  phases: ProjectPhase[];
  task?: ProjectTask | null;
  defaultPhaseId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'task', label: tx('Tarefa') },
  { value: 'feature', label: tx('Funcionalidade') },
  { value: 'story', label: tx('História') },
  { value: 'epic', label: tx('Épico') },
  { value: 'bug', label: tx('Bug') },
  { value: 'milestone', label: tx('Marco') },
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
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPhaseId(task.phase_id || '');
      setTaskType(task.task_type);
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeName(task.assignee_name || '');
      setAssigneeId(task.assignee_id || null);
      setEstimatedHours(task.estimated_hours?.toString() || '');
      setStoryPoints(task.story_points?.toString() || '');
      setPlannedStartDate(task.planned_start_date?.split('T')[0] || '');
      setPlannedEndDate(task.planned_end_date?.split('T')[0] || '');
      setChecklist(Array.isArray(task.checklist) ? task.checklist : []);
    } else {
      setTitle('');
      setDescription('');
      setPhaseId(defaultPhaseId || '');
      setTaskType('task');
      setStatus('todo');
      setPriority('medium');
      setAssigneeName('');
      setAssigneeId(null);
      setEstimatedHours('');
      setStoryPoints('');
      setPlannedStartDate('');
      setPlannedEndDate('');
      setChecklist([]);
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
      assignee_id: assigneeId,
      assignee_name: assigneeName || null,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      story_points: storyPoints ? parseInt(storyPoints) : null,
      planned_start_date: plannedStartDate || null,
      planned_end_date: plannedEndDate || null,
      checklist: checklist.filter((c) => c.text.trim()),
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
  const { canEditProject } = useMyProjectRole(projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isEditing ? "max-w-3xl max-h-[90vh] overflow-y-auto" : "max-w-lg max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>{isEditing ? tx('Editar Tarefa') : tx('Nova Tarefa')}</DialogTitle>
          <DialogDescription>
            {isEditing ? tx('Atualize as informações da tarefa') : tx('Adicione uma nova tarefa ao projeto')}
          </DialogDescription>
        </DialogHeader>

        {isEditing && task ? (
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">{tx('Detalhes')}</TabsTrigger>
              <TabsTrigger value="collab">{tx('Equipe e Comentários')}</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              {renderForm()}
            </TabsContent>
            <TabsContent value="collab">
              <TaskCollaborationPanel
                taskId={task.id}
                projectId={projectId}
                canEdit={canEditProject}
              />
            </TabsContent>
          </Tabs>
        ) : (
          renderForm()
        )}
      </DialogContent>
    </Dialog>
  );

  function renderForm() {
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">{tx('Título *')}</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tx('Título da tarefa')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">{tx('Descrição')}</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tx('Descrição da tarefa')}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tx('Fase')}</Label>
              <Select value={phaseId} onValueChange={setPhaseId}>
                <SelectTrigger>
                  <SelectValue placeholder={tx('Selecione...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tx('Sem fase')}</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tx('Tipo')}</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tx(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tx('Status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {tx(info.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tx('Prioridade')}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {tx(info.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee">{tx('Responsável')}</Label>
            <TaskAssigneeCombobox
              value={assigneeId}
              displayName={assigneeName}
              onChange={(u) => {
                setAssigneeId(u?.user_id || null);
                setAssigneeName(u?.full_name || '');
              }}
              placeholder={tx('Atribuir a um membro da organização...')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-hours">{tx('Horas Estimadas')}</Label>
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
              <Label htmlFor="task-points">{tx('Story Points')}</Label>
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
              <Label htmlFor="task-start">{tx('Data de Início')}</Label>
              <Input
                id="task-start"
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-end">{tx('Data de Término')}</Label>
              <Input
                id="task-end"
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
              />
          </div>

          <div className="space-y-2">
            <Label>{tx('Checklist')}</Label>
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={item.done}
                  onChange={(e) => setChecklist(checklist.map((c, j) => j === i ? { ...c, done: e.target.checked } : c))} />
                <Input value={item.text} onChange={(e) => setChecklist(checklist.map((c, j) => j === i ? { ...c, text: e.target.value } : c))} />
                <Button type="button" size="sm" variant="ghost" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>✕</Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setChecklist([...checklist, { text: '', done: false }])}>
              {tx('+ Item')}
            </Button>
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tx('Cancelar')}
            </Button>
            <Button type="submit" disabled={isPending || !title}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? tx('Salvar Alterações') : tx('Criar Tarefa')}
            </Button>
          </DialogFooter>
        </form>
    );
  }
}
