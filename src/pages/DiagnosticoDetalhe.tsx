import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { NormalizationView } from '@/components/dashboard/NormalizationView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Download,
  Calculator,
  MapPin,
  Calendar,
  BarChart3,
  AlertTriangle,
  GraduationCap,
  Loader2,
  FileText,
  RotateCcw,
  PlusCircle,
  Edit,
} from 'lucide-react';
import { useCalculateAssessment } from '@/hooks/useCalculateAssessment';
import { useAssessments } from '@/hooks/useAssessments';
import { useIndicators } from '@/hooks/useIndicators';
import {
  useAssessment,
  usePillarScores,
  useIndicatorScores,
  useIssues,
  useRecommendations,
} from '@/hooks/useAssessmentData';
import { useIndicatorValues } from '@/hooks/useIndicators';
import { cn } from '@/lib/utils';
import type { Pillar, Severity } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO } from '@/types/sistur';
import { toast } from 'sonner';

const DiagnosticoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { calculate, loading: calculating } = useCalculateAssessment();
  const { updateAssessment } = useAssessments();
  const { indicators } = useIndicators();

  // Fetch data
  const { data: assessment, isLoading: loadingAssessment, refetch: refetchAssessment } = useAssessment(id);
  const { data: pillarScores = [], refetch: refetchPillarScores } = usePillarScores(id);
  const { data: indicatorScores = [], refetch: refetchIndicatorScores } = useIndicatorScores(id);
  const { data: issues = [], refetch: refetchIssues } = useIssues(id);
  const { data: recommendations = [], refetch: refetchRecommendations } = useRecommendations(id);
  const { values: indicatorValues = [] } = useIndicatorValues(id);

  // Calculate data completeness
  const totalIndicators = indicators.length;
  const filledIndicators = indicatorValues.length;
  const completenessPercentage = totalIndicators > 0 ? (filledIndicators / totalIndicators) * 100 : 0;
  const hasIncompleteData = completenessPercentage < 100 && completenessPercentage > 0;

  const handleCalculate = async () => {
    if (!id) return;
    const result = await calculate(id);
    if (result) {
      // Refetch all data after calculation
      refetchAssessment();
      refetchPillarScores();
      refetchIndicatorScores();
      refetchIssues();
      refetchRecommendations();
    }
  };

  const handleResetToDraft = async () => {
    if (!id) return;
    try {
      await updateAssessment.mutateAsync({ id, status: 'DRAFT' });
      toast.success('Diagnóstico voltou para rascunho. Você pode editar os dados.');
      refetchAssessment();
    } catch (error) {
      toast.error('Erro ao resetar diagnóstico');
    }
  };

  if (loadingAssessment) {
    return (
      <AppLayout title="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

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

  // Find critical pillar
  const criticalPillar = pillarScores.length > 0
    ? pillarScores.reduce((prev, current) =>
        current.score < prev.score ? current : prev
      )
    : null;

  const formatDate = (dateString?: string | null) => {
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

  // Type-safe destination access
  const destination = assessment.destination as { name?: string; uf?: string } | null;

  return (
    <AppLayout
      title={assessment.title}
      subtitle={destination ? `${destination.name}, ${destination.uf}` : undefined}
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
          {/* Edit / Reset to Draft */}
          {isCalculated && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Editar Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Voltar para edição?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá mudar o status do diagnóstico para "Rascunho" e você poderá editar os dados dos indicadores. 
                    Após as alterações, será necessário recalcular os índices.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDraft}>
                    Sim, voltar para edição
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {!isCalculated && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/importacoes?assessment=${id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Preencher Dados
                </Link>
              </Button>
              <Button onClick={handleCalculate} disabled={calculating || assessment.status === 'DRAFT'}>
                {calculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular Índices
                  </>
                )}
              </Button>
            </>
          )}
          {isCalculated && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/relatorios?assessment=${id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </Link>
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Incomplete Data Warning */}
      {isCalculated && hasIncompleteData && (
        <Card className="mb-6 border-accent bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <PlusCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Dados podem ser enriquecidos</p>
                  <p className="text-xs text-muted-foreground">
                    {filledIndicators} de {totalIndicators} indicadores preenchidos ({Math.round(completenessPercentage)}%). 
                    Adicionar mais dados pode melhorar a precisão do diagnóstico.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={completenessPercentage} className="w-24 h-2" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Adicionar dados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Adicionar mais dados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Para adicionar mais dados, o diagnóstico voltará ao status de rascunho e você poderá preencher os indicadores faltantes.
                        Após as alterações, será necessário recalcular os índices.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetToDraft}>
                        Sim, adicionar dados
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Card */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={statusVariants[assessment.status as keyof typeof statusVariants]}>
                {statusLabels[assessment.status as keyof typeof statusLabels]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Versão do algoritmo: {assessment.algo_version}
              </span>
            </div>

            <div className="flex flex-wrap gap-6">
              {destination && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {destination.name}, {destination.uf}
                  </span>
                </div>
              )}
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

      {isCalculated && pillarScores.length > 0 ? (
        <Tabs defaultValue="radiografia" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="radiografia" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Radiografia</span>
            </TabsTrigger>
            <TabsTrigger value="normalizacao" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Normalização</span>
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="gap-2">
              <BarChart3 className="h-4 w-4" />
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
                  pillar={ps.pillar as Pillar}
                  score={ps.score}
                  severity={ps.severity as Severity}
                  isCritical={criticalPillar && ps.pillar === criticalPillar.pillar}
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
                  O destino <strong>{destination?.name}</strong>{' '}
                  apresenta como <strong>ponto crítico</strong> o pilar{' '}
                  <strong className="text-severity-critical">
                    {criticalPillar?.pillar === 'RA'
                      ? 'Relações Ambientais (IRA)'
                      : criticalPillar?.pillar === 'OE'
                      ? 'Organização Estrutural (IOE)'
                      : 'Ações Operacionais (IAO)'}
                  </strong>{' '}
                  com score de{' '}
                  <strong>{Math.round((criticalPillar?.score || 0) * 100)}%</strong>.
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

          {/* Normalização Tab - SISTUR Add-on Required */}
          <TabsContent value="normalizacao">
            <NormalizationView 
              indicatorScores={indicatorScores as any} 
              indicatorValues={indicatorValues}
            />
          </TabsContent>

          {/* Indicadores Tab */}
          <TabsContent value="indicadores" className="space-y-6">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-display font-semibold mb-4">
                Scores por Indicador
              </h3>
              {indicatorScores.length > 0 ? (
                <div className="space-y-4">
                  {indicatorScores.map((score) => {
                    const indicator = score.indicator as { name?: string; pillar?: string; description?: string } | null;
                    return (
                      <div key={score.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                (indicator?.pillar?.toLowerCase() || 'ra') as 'ra' | 'oe' | 'ao'
                              }
                            >
                              {indicator?.pillar || '—'}
                            </Badge>
                            <span className="font-medium text-sm">
                              {indicator?.name || 'Indicador'}
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
                        {indicator?.description && (
                          <p className="text-xs text-muted-foreground">
                            {indicator.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum indicador calculado.</p>
              )}
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

            {issues.length > 0 ? (
              <div className="space-y-3">
                {issues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={{
                      ...issue,
                      pillar: issue.pillar as Pillar,
                      severity: issue.severity as Severity,
                      evidence: (issue.evidence as { indicators: { name: string; score: number }[] }) || { indicators: [] },
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum gargalo identificado.
              </div>
            )}
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

            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={{
                      ...rec,
                      issue: rec.issue ? {
                        ...rec.issue,
                        pillar: (rec.issue as any).pillar as Pillar,
                        severity: (rec.issue as any).severity as Severity,
                        evidence: (rec.issue as any).evidence || { indicators: [] },
                      } : undefined,
                      course: rec.course ? {
                        ...rec.course,
                        level: (rec.course as any).level as 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO',
                        tags: (rec.course as any).tags || [],
                      } : undefined,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma recomendação gerada. Adicione cursos ao catálogo EDU.
              </div>
            )}

            {recommendations.length > 0 && (
              <Button className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Exportar Plano de Capacitação
              </Button>
            )}
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
              ? 'Complete o preenchimento dos indicadores via formulário ou importe um arquivo CSV com os dados.'
              : 'Todos os dados foram preenchidos. Clique no botão abaixo para calcular os índices e gerar o diagnóstico.'}
          </p>
          <div className="flex gap-3 justify-center">
            {assessment.status === 'DRAFT' && (
              <Button variant="outline" asChild>
                <Link to={`/importacoes?assessment=${id}`}>
                  Preencher Dados
                </Link>
              </Button>
            )}
            <Button onClick={handleCalculate} disabled={calculating || assessment.status === 'DRAFT'}>
              {calculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Índices
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DiagnosticoDetalhe;
