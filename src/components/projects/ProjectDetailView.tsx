import { useState } from 'react';
import {
  useProject,
  useProjectPhases,
  useProjectTasks,
  useProjectMilestones,
  useUpdateProject,
  useUpdatePhase,
  useUpdateTask,
  PROJECT_STATUS_INFO,
  METHODOLOGY_INFO,
  TASK_STATUS_INFO,
  PRIORITY_INFO,
  ProjectStatus,
  TaskStatus,
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
  Target,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  const [activeTab, setActiveTab] = useState('overview');

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
          {phases?.map((phase) => (
            <Card key={phase.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    {phase.description && (
                      <CardDescription>{phase.description}</CardDescription>
                    )}
                  </div>
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
                      />
                    ))}
                  {tasks?.filter((t) => t.phase_id === phase.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa nesta fase</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
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
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        milestone.status === 'completed' && 'bg-green-100 text-green-600',
                        milestone.status === 'pending' && 'bg-blue-100 text-blue-600',
                        milestone.status === 'missed' && 'bg-red-100 text-red-600'
                      )}
                    >
                      <Milestone className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{milestone.name}</p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                    </div>
                    <div className="text-right">
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
    </div>
  );
}

interface TaskRowProps {
  task: ReturnType<typeof useProjectTasks>['data'] extends (infer T)[] | undefined ? T : never;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

function TaskRow({ task, onStatusChange }: TaskRowProps) {
  if (!task) return null;

  const taskStatusInfo = TASK_STATUS_INFO[task.status];
  const priorityInfo = PRIORITY_INFO[task.priority];

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className={cn('w-2 h-2 rounded-full shrink-0', priorityInfo.color)} />
        <div className="min-w-0">
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
    </div>
  );
}
