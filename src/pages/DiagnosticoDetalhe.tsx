import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { NormalizationView } from '@/components/dashboard/NormalizationView';
import { IndicatorScoresView } from '@/components/dashboard/IndicatorScoresView';
import { IssuesView } from '@/components/dashboard/IssuesView';
import { EduRecommendationsPanel } from '@/components/dashboard/EduRecommendationsPanel';
import { IGMAWarningsPanel } from '@/components/dashboard/IGMAWarningsPanel';
import { ActionPlansView } from '@/components/dashboard/ActionPlansView';
import { EnterpriseCategoriesView } from '@/components/dashboard/EnterpriseCategoriesView';
import { DataValidationPanel } from '@/components/official-data/DataValidationPanel';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  ClipboardList,
  Database,
  Hotel,
  Layers,
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
  useEnterpriseIndicatorValuesForAssessment,
} from '@/hooks/useAssessmentData';
import { useIndicatorValues } from '@/hooks/useIndicators';
import { useFetchOfficialData, useExternalIndicatorValues, useValidateIndicatorValues } from '@/hooks/useOfficialData';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Pillar, Severity, TerritorialInterpretation } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO } from '@/types/sistur';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DiagnosticoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { calculate, loading: calculating } = useCalculateAssessment();
  const { updateAssessment } = useAssessments();
  const { indicators } = useIndicators();
  const { user } = useAuth();
  const [isPreFillOpen, setIsPreFillOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();

  // Fetch org_id for current user
  useEffect(() => {
    const fetchOrgId = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (data) setOrgId(data.org_id);
    };
    fetchOrgId();
  }, [user?.id]);

  // Fetch data
  const { data: assessment, isLoading: loadingAssessment, refetch: refetchAssessment } = useAssessment(id);
  const diagnosticType = (assessment as any)?.diagnostic_type || 'territorial';
  const isEnterprise = diagnosticType === 'enterprise';
  
  const { data: pillarScores = [], refetch: refetchPillarScores } = usePillarScores(id);
  const { data: indicatorScores = [], refetch: refetchIndicatorScores } = useIndicatorScores(id, diagnosticType);
  const { data: issues = [], refetch: refetchIssues } = useIssues(id);
  const { data: recommendations = [], refetch: refetchRecommendations } = useRecommendations(id);
  
  // Use appropriate indicator values based on diagnostic type
  const { values: territorialIndicatorValues = [] } = useIndicatorValues(id);
  const { data: enterpriseIndicatorValues = [] } = useEnterpriseIndicatorValuesForAssessment(isEnterprise ? id : undefined);
  const indicatorValues = isEnterprise ? enterpriseIndicatorValues : territorialIndicatorValues;

  // Official data hooks - destination info
  const assessmentDestination = assessment?.destination as { name?: string; uf?: string; ibge_code?: string } | null;
  const ibgeCode = assessmentDestination?.ibge_code;
  
  const { data: externalValues = [], isLoading: loadingExternalValues } = useExternalIndicatorValues(ibgeCode, orgId);
  const fetchOfficialData = useFetchOfficialData();
  const validateIndicatorValues = useValidateIndicatorValues();

  // Calculate data completeness based on diagnostic type
  const totalIndicators = isEnterprise ? enterpriseIndicatorValues.length : indicators.length;
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

  return (
    <AppLayout
      title={assessment.title}
      subtitle={assessmentDestination ? `${assessmentDestination.name}, ${assessmentDestination.uf}` : undefined}
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
              {/* Pre-fill button with Sheet */}
              <Sheet open={isPreFillOpen} onOpenChange={setIsPreFillOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" disabled={!ibgeCode}>
                    <Database className="mr-2 h-4 w-4" />
                    Pré-preencher
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Pré-preenchimento de Dados Oficiais</SheetTitle>
                    <SheetDescription>
                      Busque e valide dados de fontes oficiais para preencher automaticamente os indicadores
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <DataValidationPanel
                      ibgeCode={ibgeCode || ''}
                      orgId={orgId || ''}
                      destinationName={assessmentDestination?.name || ''}
                      onValidationComplete={() => {
                        toast.success('Dados validados com sucesso!');
                        setIsPreFillOpen(false);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              
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
              {assessmentDestination && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {assessmentDestination.name}, {assessmentDestination.uf}
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
          <TabsList className={cn(
            "grid w-full",
            isEnterprise ? "max-w-4xl grid-cols-7" : "max-w-3xl grid-cols-6"
          )}>
            <TabsTrigger value="radiografia" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Radiografia</span>
            </TabsTrigger>
            {isEnterprise && (
              <TabsTrigger value="categorias" className="gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
            )}
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
            <TabsTrigger value="planos" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
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

            {/* IGMA Warnings Panel */}
            {assessment.igma_interpretation && (
              <IGMAWarningsPanel 
                igmaInterpretation={assessment.igma_interpretation as any}
                nextReviewRecommendedAt={assessment.next_review_recommended_at ?? undefined}
                marketingBlocked={assessment.marketing_blocked ?? undefined}
                externalityWarning={assessment.externality_warning ?? undefined}
                raLimitation={(assessment as any).ra_limitation ?? undefined}
                governanceBlock={(assessment as any).governance_block ?? undefined}
              />
            )}

            {/* Summary */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-display font-semibold mb-4">
                Resumo do Diagnóstico
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  O destino <strong>{assessmentDestination?.name}</strong>{' '}
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

          {/* Categorias Enterprise Tab - Only for enterprise diagnostics */}
          {isEnterprise && (
            <TabsContent value="categorias" className="space-y-6">
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl border border-amber-500/20 p-6 mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/20">
                    <Hotel className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      Categorias Enterprise
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Visão consolidada por categorias: Performance, Sustentabilidade, Governança e mais
                    </p>
                  </div>
                </div>
              </div>
              <EnterpriseCategoriesView indicatorScores={indicatorScores as any} />
            </TabsContent>
          )}

          {/* Normalização Tab - SISTUR Add-on Required */}
          <TabsContent value="normalizacao">
            <NormalizationView 
              indicatorScores={indicatorScores as any} 
              indicatorValues={indicatorValues}
            />
          </TabsContent>

          {/* Indicadores Tab */}
          <TabsContent value="indicadores" className="space-y-6">
            <IndicatorScoresView indicatorScores={indicatorScores as any} />
          </TabsContent>

          {/* Gargalos Tab */}
          <TabsContent value="gargalos" className="space-y-4">
            <IssuesView issues={issues as any} />
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
                    Prescrições automáticas baseadas nos indicadores críticos e em atenção
                  </p>
                </div>
              </div>
            </div>

            {/* EDU Recommendations Panel - Now uses prescriptions from DB */}
            <EduRecommendationsPanel indicatorScores={indicatorScores as any} assessmentId={id} />
          </TabsContent>

          {/* Planos de Ação Tab */}
          <TabsContent value="planos">
            <ActionPlansView assessmentId={id!} />
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
              <>
                <Button variant="default" asChild>
                  <Link to={`/nova-rodada?resume=${id}`}>
                    Continuar Fluxo Guiado
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/importacoes?assessment=${id}`}>
                    Ir direto para Preenchimento
                  </Link>
                </Button>
              </>
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
