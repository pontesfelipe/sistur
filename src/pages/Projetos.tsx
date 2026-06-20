import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProjects, PROJECT_STATUS_INFO, METHODOLOGY_INFO, PRIORITY_INFO } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FolderKanban,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Target,
  BarChart3,
  Loader2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectDetailView } from '@/components/projects/ProjectDetailView';
import { cn } from '@/lib/utils';
import { useProjectsPortfolioImpact } from '@/hooks/useProjectsPortfolio';
import { TrendingUp, TrendingDown, Target as TargetIcon, Download } from 'lucide-react';
import { exportPortfolioCSV } from '@/lib/projectExports';

export default function Projetos() {
  const { data: projects, isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link: /projetos?fromAssessment=<id>&indicators=CODE1,CODE2
  // — opens the create dialog already locked to that assessment and pre-filters
  // which indicators become baseline links. Used by Modo Prescrição.
  const fromAssessment = searchParams.get('fromAssessment') || undefined;
  const prefilledCodes = useMemo(() => {
    const raw = searchParams.get('indicators');
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  }, [searchParams]);

  useEffect(() => {
    if (fromAssessment) setCreateDialogOpen(true);
  }, [fromAssessment]);

  const handleDialogChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open && fromAssessment) {
      const next = new URLSearchParams(searchParams);
      next.delete('fromAssessment');
      next.delete('indicators');
      setSearchParams(next, { replace: true });
    }
  };

  const activeProjects = projects?.filter((p) => p.status === 'in_progress') || [];
  const planningProjects = projects?.filter((p) => p.status === 'planning') || [];
  const completedProjects = projects?.filter((p) => p.status === 'completed') || [];
  const otherProjects = projects?.filter((p) => ['on_hold', 'cancelled'].includes(p.status)) || [];
  const { data: portfolio } = useProjectsPortfolioImpact();

  if (selectedProjectId) {
    return (
      <AppLayout title="Projeto">
        <ProjectDetailView
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gerenciamento de Projetos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-primary" />
              Gerenciamento de Projetos
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie projetos baseados em diagnósticos e relatórios
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!projects || projects.length === 0}
              onClick={() => {
                if (!projects) return;
                exportPortfolioCSV(
                  projects.map((p) => ({
                    nome: p.name,
                    status: PROJECT_STATUS_INFO[p.status]?.label ?? p.status,
                    metodologia: METHODOLOGY_INFO[p.methodology]?.name ?? p.methodology,
                    prioridade: PRIORITY_INFO[p.priority]?.label ?? p.priority,
                    destino: p.destination?.name ?? '',
                    uf: p.destination?.uf ?? '',
                    inicio_planejado: p.planned_start_date ?? '',
                    fim_planejado: p.planned_end_date ?? '',
                    orcamento_estimado: p.budget_estimated ?? '',
                    orcamento_realizado: p.budget_actual ?? '',
                    criado_em: p.created_at,
                  })),
                );
              }}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{projects?.length || 0}</p>
                </div>
                <FolderKanban className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Andamento</p>
                  <p className="text-2xl font-bold text-amber-600">{activeProjects.length}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Planejamento</p>
                  <p className="text-2xl font-bold text-blue-600">{planningProjects.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                  <p className="text-2xl font-bold text-green-600">{completedProjects.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio impact rollup (Frente 1+2) */}
        {portfolio && portfolio.total > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Impacto agregado do portfólio
              </CardTitle>
              <CardDescription>
                Indicadores monitorados em {portfolio.projectsWithLinks} projeto(s) com baseline registrado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Indicadores vinculados</p>
                  <p className="text-2xl font-bold">{portfolio.total}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-600" /> Melhoraram</p>
                  <p className="text-2xl font-bold text-emerald-600">{portfolio.improved}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-600" /> Regrediram</p>
                  <p className="text-2xl font-bold text-red-600">{portfolio.regressed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TargetIcon className="h-3 w-3 text-primary" /> Atingiram meta</p>
                  <p className="text-2xl font-bold text-primary">{portfolio.reachedTarget}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todos ({projects?.length || 0})</TabsTrigger>
            <TabsTrigger value="active">Em Andamento ({activeProjects.length})</TabsTrigger>
            <TabsTrigger value="planning">Planejamento ({planningProjects.length})</TabsTrigger>
            <TabsTrigger value="completed">Concluídos ({completedProjects.length})</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                <ProjectGrid projects={projects || []} onSelect={setSelectedProjectId} />
              </TabsContent>
              <TabsContent value="active" className="space-y-4">
                <ProjectGrid projects={activeProjects} onSelect={setSelectedProjectId} />
              </TabsContent>
              <TabsContent value="planning" className="space-y-4">
                <ProjectGrid projects={planningProjects} onSelect={setSelectedProjectId} />
              </TabsContent>
              <TabsContent value="completed" className="space-y-4">
                <ProjectGrid projects={completedProjects} onSelect={setSelectedProjectId} />
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Empty state */}
        {!isLoading && (!projects || projects.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto criado</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Crie seu primeiro projeto baseado em um diagnóstico calculado e relatório gerado.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={handleDialogChange}
        lockedAssessmentId={fromAssessment}
        prefilledIndicatorCodes={prefilledCodes}
      />
    </AppLayout>
  );
}

interface ProjectGridProps {
  projects: ReturnType<typeof useProjects>['data'];
  onSelect: (id: string) => void;
}

function ProjectGrid({ projects, onSelect }: ProjectGridProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum projeto nesta categoria
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onClick={() => onSelect(project.id)} />
      ))}
    </div>
  );
}

interface ProjectCardProps {
  project: NonNullable<ReturnType<typeof useProjects>['data']>[number];
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusInfo = PROJECT_STATUS_INFO[project.status];
  const methodologyInfo = METHODOLOGY_INFO[project.methodology];
  const priorityInfo = PRIORITY_INFO[project.priority];

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description || 'Sem descrição'}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={cn('text-xs text-white shrink-0', statusInfo.color)}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Destination */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="truncate">
            {project.destination?.name}
            {project.destination?.uf && ` - ${project.destination.uf}`}
          </span>
        </div>

        {/* Assessment */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="truncate">{project.assessment?.title}</span>
        </div>

        {/* Dates */}
        {project.planned_start_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(project.planned_start_date), 'dd/MM/yyyy', { locale: ptBR })}
              {project.planned_end_date &&
                ` - ${format(new Date(project.planned_end_date), 'dd/MM/yyyy', { locale: ptBR })}`}
            </span>
          </div>
        )}

        {/* Footer badges */}
        <div className="flex items-center gap-2 pt-2">
          <Badge variant="outline" className="text-xs">
            {methodologyInfo.name}
          </Badge>
          <Badge
            variant="secondary"
            className={cn('text-xs text-white', priorityInfo.color)}
          >
            {priorityInfo.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
