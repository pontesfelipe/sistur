import { useState } from 'react';
import {
  useProject,
  useProjectPhases,
  useProjectTasks,
  useProjectMilestones,
  useUpdateProject,
  useUpdatePhase,
  useUpdateTask,
  useDeletePhase,
  useDeleteTask,
  useDeleteMilestone,
  PROJECT_STATUS_INFO,
  METHODOLOGY_INFO,
  TASK_STATUS_INFO,
  PRIORITY_INFO,
  ProjectStatus,
  TaskStatus,
  ProjectPhase,
  ProjectTask,
  ProjectMilestone,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Loader2,
  MapPin,
  Milestone,
  Pencil,
  Plus,
  Target,
  Trash2,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EditProjectDialog } from './EditProjectDialog';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { PhaseFormDialog } from './PhaseFormDialog';
import { TaskFormDialog } from './TaskFormDialog';
import { MilestoneFormDialog } from './MilestoneFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: phases } = useProjectPhases(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const { data: milestones } = useProjectMilestones(projectId);
  const updateProject = useUpdateProject();
  const updatePhase = useUpdatePhase();
  const updateTask = useUpdateTask();
  const deletePhase = useDeletePhase();
  const deleteTask = useDeleteTask();
  const deleteMilestone = useDeleteMilestone();

  const [activeTab, setActiveTab] = useState('overview');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Phase dialogs
  const [phaseFormOpen, setPhaseFormOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [deletePhaseOpen, setDeletePhaseOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<ProjectPhase | null>(null);

  // Task dialogs
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [defaultTaskPhaseId, setDefaultTaskPhaseId] = useState<string | null>(null);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);

  // Milestone dialogs
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);
  const [deleteMilestoneOpen, setDeleteMilestoneOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<ProjectMilestone | null>(null);

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const statusInfo = PROJECT_STATUS_INFO[project.status];
  const methodologyInfo = METHODOLOGY_INFO[project.methodology];

  // Calculate progress
  const completedTasks = tasks?.filter((t) => t.status === 'done').length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleStatusChange = (newStatus: ProjectStatus) => {
    updateProject.mutate({ id: project.id, updates: { status: newStatus } });
  };

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask.mutate({ id: taskId, updates: { status: newStatus } });
  };

  // Phase actions
  const handleAddPhase = () => {
    setEditingPhase(null);
    setPhaseFormOpen(true);
  };

  const handleEditPhase = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setPhaseFormOpen(true);
  };

  const handleDeletePhaseClick = (phase: ProjectPhase) => {
    setPhaseToDelete(phase);
    setDeletePhaseOpen(true);
  };

  const confirmDeletePhase = async () => {
    if (phaseToDelete) {
      await deletePhase.mutateAsync({ id: phaseToDelete.id, projectId });
      setDeletePhaseOpen(false);
      setPhaseToDelete(null);
    }
  };

  // Task actions
  const handleAddTask = (phaseId?: string) => {
    setEditingTask(null);
    setDefaultTaskPhaseId(phaseId || null);
    setTaskFormOpen(true);
  };

  const handleEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setDefaultTaskPhaseId(task.phase_id);
    setTaskFormOpen(true);
  };

  const handleDeleteTaskClick = (task: ProjectTask) => {
    setTaskToDelete(task);
    setDeleteTaskOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      await deleteTask.mutateAsync({ id: taskToDelete.id, projectId });
      setDeleteTaskOpen(false);
      setTaskToDelete(null);
    }
  };

  // Milestone actions
  const handleAddMilestone = () => {
    setEditingMilestone(null);
    setMilestoneFormOpen(true);
  };

  const handleEditMilestone = (milestone: ProjectMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneFormOpen(true);
  };

  const handleDeleteMilestoneClick = (milestone: ProjectMilestone) => {
    setMilestoneToDelete(milestone);
    setDeleteMilestoneOpen(true);
  };

  const confirmDeleteMilestone = async () => {
    if (milestoneToDelete) {
      await deleteMilestone.mutateAsync({ id: milestoneToDelete.id, projectId });
      setDeleteMilestoneOpen(false);
      setMilestoneToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold">{project.name}</h1>
            <Badge
              variant="secondary"
              className={cn('text-white', statusInfo.color)}
            >
              {statusInfo.label}
            </Badge>
            <Badge variant="outline">{methodologyInfo.name}</Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {project.destination?.name}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {project.assessment?.title}
            </span>
            {project.planned_start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(project.planned_start_date), 'dd/MM/yyyy', { locale: ptBR })}
                {project.planned_end_date &&
                  ` - ${format(new Date(project.planned_end_date), 'dd/MM/yyyy', { locale: ptBR })}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="text-2xl font-bold">{progressPercent}%</p>
              </div>
              <Target className="h-8 w-8 text-primary/50" />
            </div>
            <Progress value={progressPercent} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tarefas</p>
                <p className="text-2xl font-bold">
                  {completedTasks}/{totalTasks}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fases</p>
                <p className="text-2xl font-bold">{phases?.length || 0}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Marcos</p>
                <p className="text-2xl font-bold">{milestones?.length || 0}</p>
              </div>
              <Milestone className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="phases">Fases ({phases?.length || 0})</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="milestones">Marcos ({milestones?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Phases Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fases do Projeto</CardTitle>
              <CardDescription>
                Metodologia {methodologyInfo.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {phases?.map((phase, index) => {
                  const phaseTasks = tasks?.filter((t) => t.phase_id === phase.id) || [];
                  const completed = phaseTasks.filter((t) => t.status === 'done').length;
                  const phaseProgress = phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0;

                  return (
                    <div key={phase.id} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{phase.name}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              phase.status === 'completed' && 'bg-green-100 text-green-700',
                              phase.status === 'in_progress' && 'bg-amber-100 text-amber-700',
                              phase.status === 'blocked' && 'bg-red-100 text-red-700'
                            )}
                          >
                            {phase.status === 'pending' && 'Pendente'}
                            {phase.status === 'in_progress' && 'Em Progresso'}
                            {phase.status === 'completed' && 'Concluído'}
                            {phase.status === 'blocked' && 'Bloqueado'}
                          </Badge>
                        </div>
                        <Progress value={phaseProgress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks?.slice(0, 5).map((task) => {
                  const taskStatusInfo = TASK_STATUS_INFO[task.status];
                  const priorityInfo = PRIORITY_INFO[task.priority];

                  return (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full', priorityInfo.color)} />
                        <span className="font-medium text-sm">{task.title}</span>
                      </div>
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleTaskStatusChange(task.id, v as TaskStatus)}
                      >
                        <SelectTrigger className="w-32 h-8">
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
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddPhase}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fase
            </Button>
          </div>
          {phases?.map((phase) => (
            <Card key={phase.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    {phase.description && (
                      <CardDescription>{phase.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={phase.status}
                      onValueChange={(v) =>
                        updatePhase.mutate({ id: phase.id, updates: { status: v as any } })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="blocked">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => handleEditPhase(phase)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeletePhaseClick(phase)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks
                    ?.filter((t) => t.phase_id === phase.id)
                    .map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={handleTaskStatusChange}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => handleDeleteTaskClick(task)}
                      />
                    ))}
                  {tasks?.filter((t) => t.phase_id === phase.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa nesta fase</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleAddTask(phase.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Tarefa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!phases || phases.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Nenhuma fase criada</p>
                <Button variant="outline" className="mt-4" onClick={handleAddPhase}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira fase
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleAddTask()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Todas as Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks?.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                    onEdit={() => handleEditTask(task)}
                    onDelete={() => handleDeleteTaskClick(task)}
                  />
                ))}
                {(!tasks || tasks.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma tarefa criada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddMilestone}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Marco
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Marcos do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones?.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        milestone.status === 'completed' && 'bg-green-100 text-green-600',
                        milestone.status === 'pending' && 'bg-blue-100 text-blue-600',
                        milestone.status === 'missed' && 'bg-red-100 text-red-600'
                      )}
                    >
                      <Milestone className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{milestone.name}</p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground truncate">{milestone.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {format(new Date(milestone.target_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          milestone.status === 'completed' && 'bg-green-100 text-green-700',
                          milestone.status === 'pending' && 'bg-blue-100 text-blue-700',
                          milestone.status === 'missed' && 'bg-red-100 text-red-700'
                        )}
                      >
                        {milestone.status === 'pending' && 'Pendente'}
                        {milestone.status === 'completed' && 'Concluído'}
                        {milestone.status === 'missed' && 'Atrasado'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEditMilestone(milestone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteMilestoneClick(milestone)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!milestones || milestones.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum marco definido
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Project Dialogs */}
      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={onBack}
      />

      {/* Phase Dialogs */}
      <PhaseFormDialog
        projectId={projectId}
        phase={editingPhase}
        phasesCount={phases?.length || 0}
        open={phaseFormOpen}
        onOpenChange={setPhaseFormOpen}
      />
      <DeleteConfirmDialog
        open={deletePhaseOpen}
        onOpenChange={setDeletePhaseOpen}
        title="Excluir Fase"
        description={`Tem certeza que deseja excluir a fase "${phaseToDelete?.name}"? As tarefas associadas também serão removidas.`}
        onConfirm={confirmDeletePhase}
        isPending={deletePhase.isPending}
      />

      {/* Task Dialogs */}
      <TaskFormDialog
        projectId={projectId}
        phases={phases || []}
        task={editingTask}
        defaultPhaseId={defaultTaskPhaseId}
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
      />
      <DeleteConfirmDialog
        open={deleteTaskOpen}
        onOpenChange={setDeleteTaskOpen}
        title="Excluir Tarefa"
        description={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.title}"?`}
        onConfirm={confirmDeleteTask}
        isPending={deleteTask.isPending}
      />

      {/* Milestone Dialogs */}
      <MilestoneFormDialog
        projectId={projectId}
        milestone={editingMilestone}
        open={milestoneFormOpen}
        onOpenChange={setMilestoneFormOpen}
      />
      <DeleteConfirmDialog
        open={deleteMilestoneOpen}
        onOpenChange={setDeleteMilestoneOpen}
        title="Excluir Marco"
        description={`Tem certeza que deseja excluir o marco "${milestoneToDelete?.name}"?`}
        onConfirm={confirmDeleteMilestone}
        isPending={deleteMilestone.isPending}
      />
    </div>
  );
}

interface TaskRowProps {
  task: ProjectTask;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TaskRow({ task, onStatusChange, onEdit, onDelete }: TaskRowProps) {
  if (!task) return null;

  const priorityInfo = PRIORITY_INFO[task.priority];

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn('w-2 h-2 rounded-full shrink-0', priorityInfo.color)} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {task.assignee_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {task.assignee_name}
              </span>
            )}
            {task.estimated_hours && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.estimated_hours}h
              </span>
            )}
            {task.tags?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {task.tags[0]}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Select
          value={task.status}
          onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
        >
          <SelectTrigger className="w-32 h-8">
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
