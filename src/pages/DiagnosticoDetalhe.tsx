import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Download,
  Calculator,
  MapPin,
  Calendar,
  BarChart3,
  AlertTriangle,
  GraduationCap,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  mockAssessments,
  mockPillarScores,
  mockIssues,
  mockRecommendations,
  mockIndicators,
  mockIndicatorScores,
} from '@/data/mockData';
import { cn } from '@/lib/utils';

const DiagnosticoDetalhe = () => {
  const { id } = useParams();
  const assessment = mockAssessments.find((a) => a.id === id);

  if (!assessment) {
    return (
      <AppLayout title="Diagnóstico não encontrado">
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            O diagnóstico solicitado não foi encontrado.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/diagnosticos">Voltar para diagnósticos</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isCalculated = assessment.status === 'CALCULATED';
  const pillarScores = mockPillarScores;
  const issues = mockIssues;
  const recommendations = mockRecommendations;

  // Find critical pillar
  const criticalPillar = pillarScores.reduce((prev, current) =>
    prev.score < current.score ? prev : current
  );

  // Get indicator scores with indicator data
  const indicatorScoresWithData = mockIndicatorScores.map((score) => ({
    ...score,
    indicator: mockIndicators.find((ind) => ind.id === score.indicator_id),
  }));

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const statusVariants = {
    DRAFT: 'draft',
    DATA_READY: 'ready',
    CALCULATED: 'calculated',
  } as const;

  const statusLabels = {
    DRAFT: 'Rascunho',
    DATA_READY: 'Dados Prontos',
    CALCULATED: 'Calculado',
  };

  return (
    <AppLayout
      title={assessment.title}
      subtitle={`${assessment.destination?.name}, ${assessment.destination?.uf}`}
    >
      {/* Back button and actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link to="/diagnosticos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex gap-2">
          {!isCalculated && (
            <Button>
              <Calculator className="mr-2 h-4 w-4" />
              Calcular Índices
            </Button>
          )}
          {isCalculated && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={statusVariants[assessment.status]}>
                {statusLabels[assessment.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Versão do algoritmo: {assessment.algo_version}
              </span>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {assessment.destination?.name}, {assessment.destination?.uf}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDate(assessment.period_start)} —{' '}
                  {formatDate(assessment.period_end)}
                </span>
              </div>
            </div>
          </div>

          {isCalculated && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Calculado em</p>
              <p className="font-medium">{formatDate(assessment.calculated_at)}</p>
            </div>
          )}
        </div>
      </div>

      {isCalculated ? (
        <Tabs defaultValue="radiografia" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="radiografia" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Radiografia</span>
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Indicadores</span>
            </TabsTrigger>
            <TabsTrigger value="gargalos" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Gargalos</span>
            </TabsTrigger>
            <TabsTrigger value="tratamento" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Tratamento</span>
            </TabsTrigger>
          </TabsList>

          {/* Radiografia Tab */}
          <TabsContent value="radiografia" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pillarScores.map((ps) => (
                <PillarGauge
                  key={ps.id}
                  pillar={ps.pillar}
                  score={ps.score}
                  severity={ps.severity}
                  isCritical={ps.pillar === criticalPillar.pillar}
                />
              ))}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-display font-semibold mb-4">
                Resumo do Diagnóstico
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  O destino <strong>{assessment.destination?.name}</strong>{' '}
                  apresenta como <strong>ponto crítico</strong> o pilar{' '}
                  <strong className="text-severity-critical">
                    {criticalPillar.pillar === 'RA'
                      ? 'Relações Ambientais (IRA)'
                      : criticalPillar.pillar === 'OE'
                      ? 'Organização Estrutural (IOE)'
                      : 'Ações Operacionais (IAO)'}
                  </strong>{' '}
                  com score de{' '}
                  <strong>{Math.round(criticalPillar.score * 100)}%</strong>.
                </p>
                <p>
                  Foram identificados <strong>{issues.length} gargalos</strong>{' '}
                  principais, dos quais{' '}
                  <strong>
                    {issues.filter((i) => i.severity === 'CRITICO').length} são
                    críticos
                  </strong>
                  . O sistema recomenda{' '}
                  <strong>{recommendations.length} cursos de capacitação</strong>{' '}
                  para endereçar os problemas identificados.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Indicadores Tab */}
          <TabsContent value="indicadores" className="space-y-6">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-display font-semibold mb-4">
                Scores por Indicador
              </h3>
              <div className="space-y-4">
                {indicatorScoresWithData.map((score) => (
                  <div key={score.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            score.indicator?.pillar.toLowerCase() as
                              | 'ra'
                              | 'oe'
                              | 'ao'
                          }
                        >
                          {score.indicator?.pillar}
                        </Badge>
                        <span className="font-medium text-sm">
                          {score.indicator?.name}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'font-mono text-sm font-semibold',
                          score.score >= 0.67
                            ? 'text-severity-good'
                            : score.score >= 0.34
                            ? 'text-severity-moderate'
                            : 'text-severity-critical'
                        )}
                      >
                        {Math.round(score.score * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={score.score * 100}
                      className={cn(
                        'h-2',
                        score.score >= 0.67
                          ? '[&>div]:bg-severity-good'
                          : score.score >= 0.34
                          ? '[&>div]:bg-severity-moderate'
                          : '[&>div]:bg-severity-critical'
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {score.indicator?.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Gargalos Tab */}
          <TabsContent value="gargalos" className="space-y-4">
            <div className="bg-card rounded-xl border p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-severity-critical/10">
                  <AlertTriangle className="h-6 w-6 text-severity-critical" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">
                    {issues.filter((i) => i.severity === 'CRITICO').length}{' '}
                    gargalos críticos identificados
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Priorizados pelo impacto no pilar mais crítico
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </TabsContent>

          {/* Tratamento Tab */}
          <TabsContent value="tratamento" className="space-y-6">
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/20">
                  <GraduationCap className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    SISTUR EDU — Plano de Capacitação
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {recommendations.length} cursos recomendados com base nos
                    gargalos identificados
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>

            <Button className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Exportar Plano de Capacitação
            </Button>
          </TabsContent>
        </Tabs>
      ) : (
        /* Pre-calculation state */
        <div className="bg-card rounded-xl border p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-display font-semibold mb-2">
            {assessment.status === 'DRAFT'
              ? 'Preencha os dados para calcular'
              : 'Dados prontos para cálculo'}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {assessment.status === 'DRAFT'
              ? 'Complete o preenchimento dos indicadores ou importe um arquivo CSV com os dados.'
              : 'Todos os dados foram preenchidos. Clique no botão abaixo para calcular os índices e gerar o diagnóstico.'}
          </p>
          <div className="flex gap-3 justify-center">
            {assessment.status === 'DRAFT' && (
              <Button variant="outline">Importar CSV</Button>
            )}
            <Button disabled={assessment.status === 'DRAFT'}>
              <Calculator className="mr-2 h-4 w-4" />
              Calcular Índices
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DiagnosticoDetalhe;
