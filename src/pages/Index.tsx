import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { MandalaDestino } from '@/components/dashboard/MandalaDestino';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { DestinationComparison } from '@/components/dashboard/DestinationComparison';
import { DestinationTrend } from '@/components/dashboard/DestinationTrend';
import { EnterpriseKPICards } from '@/components/dashboard/EnterpriseKPICards';
import { ERPStatsCards } from '@/components/erp/ERPStatsCards';
import { ProjectsOverviewCard } from '@/components/erp/ProjectsOverviewCard';
import { PillarProgressChart } from '@/components/erp/PillarProgressChart';
import { CycleEvolutionChart } from '@/components/erp/CycleEvolutionChart';
import { OverdueProjectsList } from '@/components/erp/OverdueProjectsList';
import { WidgetCustomizer } from '@/components/dashboard/WidgetCustomizer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  MapPin, 
  ClipboardList, 
  AlertTriangle, 
  GraduationCap,
  Plus,
  ArrowRight,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  Filter,
  Landmark,
  Hotel,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  useAggregatedPillarScores,
  useAggregatedIssues,
  useDestinationsWithAssessments,
  useRecentAssessments,
  useTopRecommendations,
} from '@/hooks/useDashboardData';
import {
  useEnterpriseKPIs,
  useAggregatedEnterprisePillarScores,
  useEnterpriseIssues,
  useEnterpriseDashboardStats,
  useEnterpriseDestinations,
} from '@/hooks/useEnterpriseDashboardData';
import {
  useERPStats,
  usePillarProgress,
  useCycleEvolution,
  useOverdueProjects,
  useProjectStats,
} from '@/hooks/useERPMonitoring';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCardSkeleton, PillarGaugeSkeleton } from '@/components/ui/content-skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileContext } from '@/contexts/ProfileContext';

type DiagnosticMode = 'territorial' | 'enterprise';

const Index = () => {
  const { profile, effectiveOrgId } = useProfileContext();
  const { isAdmin, hasERPAccess } = useProfileContext();
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticMode>('territorial');
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);
  // Independent destination selection for the Mandala visualization
  const [mandalaDestination, setMandalaDestination] = useState<string | undefined>(undefined);
  const { isEnabled, toggleWidget, resetToDefaults } = useDashboardWidgets();

  // Fetch org settings for enterprise access
  const { data: orgSettings, isLoading: orgSettingsLoading, error: orgSettingsError } = useQuery({
    queryKey: ['org-dashboard-settings', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;
      const { data, error } = await supabase
        .rpc('get_dashboard_org_access_flags')
        .maybeSingle();
      if (error) {
        console.error('[Dashboard] Error fetching org settings:', error);
        throw error;
      }
      return data;
    },
    enabled: !!effectiveOrgId,
  });

  // Reset destination filter when switching modes
  useEffect(() => {
    setSelectedDestination(undefined);
  }, [diagnosticMode]);
  
  // Territorial hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: destinations, isLoading: destinationsLoading } = useDestinationsWithAssessments();
  const { data: aggregatedData, isLoading: aggregatedLoading } = useAggregatedPillarScores(selectedDestination);
  const { data: aggregatedIssues, isLoading: issuesLoading } = useAggregatedIssues(selectedDestination);
  const { data: recentAssessments, isLoading: recentLoading } = useRecentAssessments();
  const { data: recommendations, isLoading: recsLoading } = useTopRecommendations();

  // Enterprise hooks
  const { data: enterpriseKPIs, isLoading: enterpriseKPIsLoading } = useEnterpriseKPIs(selectedDestination);
  const { data: enterpriseStats, isLoading: enterpriseStatsLoading } = useEnterpriseDashboardStats();
  const { data: enterprisePillarData, isLoading: enterprisePillarLoading } = useAggregatedEnterprisePillarScores(selectedDestination);
  const { data: enterpriseIssues, isLoading: enterpriseIssuesLoading } = useEnterpriseIssues(selectedDestination);
  const { data: enterpriseDestinations } = useEnterpriseDestinations();

  // ERP/Project hooks (conditionally used for widgets)
  const { data: erpStats, isLoading: erpStatsLoading } = useERPStats();
  const { data: pillarProgress, isLoading: pillarProgressLoading } = usePillarProgress(diagnosticMode);
  const { data: cycleEvolution, isLoading: cycleEvolutionLoading } = useCycleEvolution(
    selectedDestination === 'all' ? undefined : selectedDestination,
    diagnosticMode
  );
  const { data: overdueProjects, isLoading: overdueProjectsLoading } = useOverdueProjects();
  const { data: projectStats, isLoading: projectStatsLoading } = useProjectStats();

  // Mandala MST opt-in: read from latest assessment of selected destination (territorial only)
  const { data: mandalaMeta } = useQuery({
    queryKey: ['mandala-meta', selectedDestination, effectiveOrgId, diagnosticMode],
    queryFn: async () => {
      if (diagnosticMode !== 'territorial') return { expand: false, name: undefined };
      let q = supabase
        .from('assessments')
        .select('expand_with_mandala, destinations(name)')
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: false })
        .limit(1);
      if (selectedDestination) q = q.eq('destination_id', selectedDestination);
      const { data } = await q.maybeSingle();
      return {
        expand: (data as any)?.expand_with_mandala === true,
        name: (data?.destinations as any)?.name as string | undefined,
      };
    },
    enabled: !!effectiveOrgId,
  });


  // Determine if enterprise mode is available
  const hasEnterpriseAccess = orgSettings?.has_enterprise_access ?? false;
  
  if (import.meta.env.DEV) {
    console.log('[Dashboard Debug]', {
      effectiveOrgId,
      orgSettings,
      orgSettingsLoading,
      orgSettingsError,
      hasEnterpriseAccess,
    });
  }

  // Select appropriate data based on mode
  const isEnterprise = diagnosticMode === 'enterprise';
  const activeDestinations = isEnterprise ? enterpriseDestinations : destinations;
  const activePillarData = isEnterprise ? enterprisePillarData : aggregatedData;
  const activeIssues = isEnterprise ? enterpriseIssues : aggregatedIssues;
  const activeLoading = isEnterprise ? enterprisePillarLoading : aggregatedLoading;
  const activeIssuesLoading = isEnterprise ? enterpriseIssuesLoading : issuesLoading;

  const criticalPillar = activePillarData?.pillarScores?.length
    ? activePillarData.pillarScores.reduce((prev, current) =>
        prev.score < current.score ? prev : current
      , activePillarData.pillarScores[0])
    : null;

  const averageScore = activePillarData?.pillarScores?.length 
    ? activePillarData.pillarScores.reduce((sum, ps) => sum + ps.score, 0) / activePillarData.pillarScores.length
    : 0;

  const getSeverityColor = (score: number) => {
    if (score >= 0.7) return 'bg-severity-good';
    if (score >= 0.5) return 'bg-severity-moderate';
    return 'bg-severity-critical';
  };

  const selectedDestinationName = selectedDestination 
    ? activeDestinations?.find(d => d.id === selectedDestination)?.name 
    : null;

  // Query for all destinations' pillar scores (for comparison)
  const { data: allDestinationScores } = useQuery({
    queryKey: ['all-destination-pillar-scores'],
    queryFn: async () => {
      if (!destinations || destinations.length === 0) return {};
      const destIds = destinations.map(d => d.id);

      // Batch: fetch all calculated assessments for all destinations at once
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, destination_id')
        .in('destination_id', destIds)
        .eq('status', 'CALCULATED');

      if (!assessments || assessments.length === 0) return {};

      const assessmentIds = assessments.map(a => a.id);

      // Batch: fetch all pillar scores for all assessments at once
      const { data: pillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (!pillarScores || pillarScores.length === 0) return {};

      // Map assessment_id -> destination_id for grouping
      const assessmentToDestMap = new Map(assessments.map(a => [a.id, a.destination_id]));

      // Group scores by destination
      const destPillarScores: Record<string, Record<string, number[]>> = {};
      pillarScores.forEach(ps => {
        const destId = assessmentToDestMap.get(ps.assessment_id);
        if (!destId) return;
        if (!destPillarScores[destId]) destPillarScores[destId] = {};
        if (!destPillarScores[destId][ps.pillar]) destPillarScores[destId][ps.pillar] = [];
        destPillarScores[destId][ps.pillar].push(ps.score);
      });

      // Aggregate into final format with calculated severity
      const scoresMap: Record<string, { pillar: 'RA' | 'OE' | 'AO'; score: number; severity: string }[]> = {};
      for (const [destId, pillars] of Object.entries(destPillarScores)) {
        scoresMap[destId] = Object.entries(pillars).map(([pillar, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return {
            pillar: pillar as 'RA' | 'OE' | 'AO',
            score: avg,
            severity: avg <= 0.33 ? 'CRITICO' : avg <= 0.66 ? 'MODERADO' : 'BOM',
          };
        });
      }
      return scoresMap;
    },
    enabled: !!destinations && destinations.length > 0,
  });

  const getDestinationData = useCallback((destinationId: string) => {
    const dest = destinations?.find(d => d.id === destinationId);
    const scores = allDestinationScores?.[destinationId];
    if (!dest || !scores) return null;
    return {
      destinationId,
      destinationName: dest.name,
      pillarScores: scores,
    };
  }, [destinations, allDestinationScores]);

  return (
    <AppLayout 
      title="Dashboard" 
      subtitle={isEnterprise ? "Visão consolidada do setor hoteleiro" : "Painel de controle do sistema de turismo"}
      actions={
        <div className="flex items-center gap-2">
          <WidgetCustomizer 
            isEnabled={isEnabled}
            toggleWidget={toggleWidget}
            resetToDefaults={resetToDefaults}
            hasERPAccess={hasERPAccess || isAdmin}
          />
          {(orgSettingsLoading && effectiveOrgId) ? (
            <Skeleton className="w-48 h-10 rounded-lg" />
          ) : hasEnterpriseAccess ? (
            <ToggleGroup 
              type="single" 
              value={diagnosticMode} 
              onValueChange={(value) => value && setDiagnosticMode(value as DiagnosticMode)}
              className="bg-muted rounded-lg p-1"
            >
              <ToggleGroupItem 
                value="territorial" 
                aria-label="Ver diagnósticos territoriais"
                className="gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <Landmark className="h-4 w-4" />
                <span className="hidden sm:inline">Territorial</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="enterprise" 
                aria-label="Ver diagnósticos enterprise"
                className="gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <Hotel className="h-4 w-4" />
                <span className="hidden sm:inline">Enterprise</span>
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
        </div>
      }
    >
      {/* Hero Stats - different for each mode */}
      {isEnterprise ? (
        <div className="mb-8">
          <EnterpriseKPICards 
            kpis={enterpriseKPIs}
            stats={enterpriseStats}
            isLoading={enterpriseKPIsLoading || enterpriseStatsLoading}
          />
        </div>
      ) : isEnabled('stats') ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard title="Destinos Cadastrados" value={stats?.totalDestinations ?? 0} icon={MapPin} variant="primary" />
              <StatCard title="Diagnósticos" value={stats?.activeAssessments ?? 0} icon={ClipboardList} />
              <StatCard title="Gargalos Críticos" value={stats?.criticalIssues ?? 0} icon={AlertTriangle} variant="warning" />
              <StatCard title="Capacitações" value={stats?.pendingRecommendations ?? 0} icon={GraduationCap} variant="success" />
            </>
          )}
        </div>
      ) : null}

      {/* ERP Stats Widget */}
      {isEnabled('erp-stats') && (hasERPAccess || isAdmin) && !isEnterprise && (
        <div className="mb-6">
          <ERPStatsCards stats={erpStats} isLoading={erpStatsLoading} />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Pillar Scores */}
          {isEnabled('pillar-scores') && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    {isEnterprise && <Hotel className="h-5 w-5 text-amber-600" />}
                    {isEnterprise ? 'Performance Hoteleira' : 'Radiografia do Destino'}
                  </CardTitle>
                  <CardDescription>
                    {selectedDestinationName 
                      ? `Dados de ${selectedDestinationName} (${activePillarData?.totalAssessments ?? 0} diagnóstico(s))`
                      : activePillarData?.totalAssessments 
                        ? `Resumo de ${activePillarData.totalAssessments} diagnóstico(s) ${isEnterprise ? 'enterprise' : 'territorial'}(s)`
                        : 'Nenhum diagnóstico disponível'}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select 
                    value={selectedDestination ?? "all"} 
                    onValueChange={(value) => setSelectedDestination(value === "all" ? undefined : value)}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder={isEnterprise ? "Filtrar unidade" : "Filtrar destino"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isEnterprise ? 'Todas as unidades' : 'Todos os destinos'}</SelectItem>
                      {activeDestinations?.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>{dest.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activePillarData?.totalAssessments && activePillarData.totalAssessments > 0 && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
                        <Link to="/relatorios">
                          <FileText className="mr-2 h-4 w-4" />
                          <span className="hidden xs:inline">Relatório</span>
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
                        <Link to="/diagnosticos">
                          <span className="hidden xs:inline">Ver diagnósticos</span>
                          <span className="xs:hidden">Ver</span>
                          <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeLoading ? (
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <PillarGaugeSkeleton />
                    <PillarGaugeSkeleton />
                    <PillarGaugeSkeleton />
                  </div>
                ) : activePillarData?.pillarScores && activePillarData.pillarScores.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                      {activePillarData.pillarScores.map((pillarScore) => (
                        <PillarGauge
                          key={pillarScore.id}
                          pillar={pillarScore.pillar}
                          score={pillarScore.score}
                          severity={pillarScore.severity}
                          isCritical={criticalPillar && pillarScore.pillar === criticalPillar.pillar}
                        />
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {isEnterprise ? 'Índice Geral Enterprise' : 'Índice Geral SISTUR'} (média)
                          </span>
                        </div>
                        <span className="font-mono font-semibold">{Math.round(averageScore * 100)}%</span>
                      </div>
                      <Progress 
                        value={averageScore * 100} 
                        className="h-2"
                        indicatorClassName={getSeverityColor(averageScore)}
                      />
                    </div>
                    {/* Mandala visualization (only territorial mode) */}
                    {!isEnterprise && (
                      <div className="mt-6">
                        <MandalaDestino
                          pillarScores={activePillarData.pillarScores.map((ps) => ({
                            pillar: ps.pillar,
                            score: ps.score,
                            severity: ps.severity,
                          }))}
                          expandWithMandala={mandalaMeta?.expand}
                          destinationName={mandalaMeta?.name}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum dado de diagnóstico disponível ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Issues */}
          {isEnabled('issues') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  {isEnterprise && <Hotel className="h-5 w-5 text-amber-600" />}
                  {isEnterprise ? 'Pontos de Atenção' : 'Gargalos Identificados'}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/diagnosticos">
                    Ver todos
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {activeIssuesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                ) : activeIssues && activeIssues.length > 0 ? (
                  <div className="space-y-3">
                    {activeIssues.map((issue: any) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    {isEnterprise ? 'Nenhum ponto de atenção identificado.' : 'Nenhum gargalo identificado.'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Destination Comparison - only for territorial */}
          {isEnabled('comparison') && !isEnterprise && destinations && destinations.length >= 2 && (
            <DestinationComparison 
              destinations={destinations}
              getDestinationData={getDestinationData}
            />
          )}

          {/* Destination Trend - only for territorial */}
          {isEnabled('trend') && !isEnterprise && destinations && destinations.length > 0 && (
            <DestinationTrend destinations={destinations} />
          )}

          {/* Projects Overview Widget */}
          {isEnabled('projects-overview') && (hasERPAccess || isAdmin) && (
            <ProjectsOverviewCard 
              projects={projectStats}
              isLoading={projectStatsLoading}
            />
          )}

          {/* ERP Charts Row */}
          {(isEnabled('cycle-evolution') || isEnabled('pillar-progress')) && (hasERPAccess || isAdmin) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isEnabled('cycle-evolution') && (
                <CycleEvolutionChart 
                  data={cycleEvolution}
                  isLoading={cycleEvolutionLoading}
                  destinations={destinations}
                  selectedDestination={selectedDestination}
                  onDestinationChange={setSelectedDestination}
                />
              )}
              {isEnabled('pillar-progress') && (
                <PillarProgressChart 
                  data={pillarProgress}
                  isLoading={pillarProgressLoading}
                />
              )}
            </div>
          )}

          {/* Overdue Projects Widget */}
          {isEnabled('overdue-projects') && (hasERPAccess || isAdmin) && (
            <OverdueProjectsList 
              projects={overdueProjects}
              isLoading={overdueProjectsLoading}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {isEnabled('quick-action') && (
            <Card className={`bg-gradient-to-br ${isEnterprise ? 'from-amber-500 to-amber-600' : 'from-primary to-primary/80'} text-primary-foreground border-0`}>
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg mb-2 flex items-center gap-2">
                  {isEnterprise && <Hotel className="h-5 w-5" />}
                  {isEnterprise ? 'Novo Diagnóstico Hoteleiro' : 'Iniciar Novo Diagnóstico'}
                </h3>
                <p className="text-primary-foreground/80 text-sm mb-4">
                  {isEnterprise 
                    ? 'Avalie a performance e sustentabilidade do seu empreendimento.'
                    : 'Crie uma nova rodada de avaliação para um destino turístico.'}
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to={`/nova-rodada${isEnterprise ? '?type=enterprise' : ''}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Rodada
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Workflow Status */}
          {isEnabled('workflow-status') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Status do Fluxo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentLoading ? (
                  <Skeleton className="h-20" />
                ) : recentAssessments && recentAssessments.length > 0 ? (
                  recentAssessments.slice(0, 3).map((assessment) => {
                    const statusConfig = {
                      DRAFT: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Rascunho', desc: 'Aguardando preenchimento' },
                      DATA_READY: { icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10', label: 'Dados Prontos', desc: 'Pronto para calcular' },
                      CALCULATED: { icon: TrendingUp, color: 'text-severity-good', bg: 'bg-severity-good/10', label: 'Calculado', desc: 'Diagnóstico completo' },
                    };
                    const config = statusConfig[assessment.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                    const StatusIcon = config.icon;
                    const destination = (assessment as any).destinations as { name?: string } | null;
                    
                    return (
                      <Link 
                        key={assessment.id} 
                        to={`/diagnosticos/${assessment.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{assessment.title}</p>
                          <p className="text-xs text-muted-foreground">{destination?.name}</p>
                        </div>
                        <Badge variant={assessment.status === 'DRAFT' ? 'draft' : assessment.status === 'DATA_READY' ? 'ready' : 'calculated'}>
                          {config.label}
                        </Badge>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum diagnóstico criado ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top Recommendations */}
          {isEnabled('recommendations') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Recomendações Prioritárias</CardTitle>
              </CardHeader>
              <CardContent>
                {recsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                ) : recommendations && recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <RecommendationCard key={rec.id} recommendation={rec as any} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma recomendação disponível.
                  </p>
                )}
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/edu/catalogo">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Ver catálogo SISTUR EDU
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
