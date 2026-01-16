import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FolderKanban, 
  ExternalLink, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { ProjectStats } from '@/hooks/useERPMonitoring';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectsOverviewCardProps {
  projects: ProjectStats[] | undefined;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  planning: {
    label: 'Planejamento',
    variant: 'secondary',
    color: 'text-muted-foreground',
  },
  in_progress: {
    label: 'Em Andamento',
    variant: 'default',
    color: 'text-severity-moderate',
  },
  on_hold: {
    label: 'Pausado',
    variant: 'outline',
    color: 'text-muted-foreground',
  },
  completed: {
    label: 'Concluído',
    variant: 'default',
    color: 'text-severity-good',
  },
  cancelled: {
    label: 'Cancelado',
    variant: 'destructive',
    color: 'text-muted-foreground',
  },
};

const METHODOLOGY_LABELS: Record<string, string> = {
  waterfall: 'Waterfall',
  safe: 'SAFe',
  scrum: 'Scrum',
  kanban: 'Kanban',
};

export function ProjectsOverviewCard({ projects, isLoading }: ProjectsOverviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-72 shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeProjects = projects?.filter(p => 
    p.status === 'in_progress' || p.status === 'planning'
  ) || [];

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projetos
          </CardTitle>
          <CardDescription>
            Nenhum projeto cadastrado. Crie projetos a partir de diagnósticos calculados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/projetos">
              Ir para Projetos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projetos em Andamento ({activeProjects.length})
          </CardTitle>
          <CardDescription>
            Acompanhamento dos projetos derivados de diagnósticos
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projetos">
            Ver todos
            <ExternalLink className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {projects.slice(0, 6).map((project) => {
              const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
              
              return (
                <Card 
                  key={project.id} 
                  className="w-72 shrink-0 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {project.destinationName}
                        </p>
                      </div>
                      <Badge 
                        variant={statusConfig.variant}
                        className="text-xs shrink-0"
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{project.completionRate}%</span>
                      </div>
                      <Progress value={project.completionRate} className="h-1.5" />
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <Badge variant="outline" className="gap-1">
                        {METHODOLOGY_LABELS[project.methodology] || project.methodology}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        {project.completedTasks}/{project.totalTasks}
                      </div>
                      {project.overdueTasks > 0 && (
                        <div className="flex items-center gap-1 text-severity-critical">
                          <AlertTriangle className="h-3 w-3" />
                          {project.overdueTasks}
                        </div>
                      )}
                    </div>

                    {project.planned_end_date && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Prazo: {format(new Date(project.planned_end_date), "dd/MM/yy", { locale: ptBR })}
                      </div>
                    )}

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-3 h-7 text-xs" 
                      asChild
                    >
                      <Link to={`/projetos?view=${project.id}`}>
                        Ver Detalhes
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
