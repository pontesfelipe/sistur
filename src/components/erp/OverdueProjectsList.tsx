import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, MapPin, ExternalLink, CheckCircle2 } from 'lucide-react';
import { OverdueProject } from '@/hooks/useERPMonitoring';
import { Link } from 'react-router-dom';

interface OverdueProjectsListProps {
  projects: OverdueProject[] | undefined;
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planejamento',
  in_progress: 'Em Andamento',
  on_hold: 'Em Espera',
};

export function OverdueProjectsList({ projects, isLoading }: OverdueProjectsListProps) {
  if (isLoading) {
    return (
      <Card className="border-severity-critical/30">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card className="border-severity-good/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-severity-good">
            <CheckCircle2 className="h-5 w-5" />
            Projetos Atrasados
          </CardTitle>
          <CardDescription className="text-severity-good">
            Nenhum projeto atrasado! Excelente gestão de cronograma.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-severity-critical/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-severity-critical">
          <AlertTriangle className="h-5 w-5" />
          Projetos Atrasados ({projects.length})
        </CardTitle>
        <CardDescription>
          Projetos que ultrapassaram a data de término prevista
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-4">
          <div className="space-y-3">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="p-3 rounded-lg border bg-severity-critical/5 border-severity-critical/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{project.destinationName}</span>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {project.daysOverdue}d atraso
                  </Badge>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      Tarefas: {project.completedTasks}/{project.totalTasks}
                    </span>
                    <span className="font-medium">{project.completionRate}%</span>
                  </div>
                  <Progress value={project.completionRate} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {STATUS_LABELS[project.status] || project.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {project.methodology}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link to="/projetos">
                      Ver <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
