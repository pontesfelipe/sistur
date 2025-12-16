import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { DestinationComparison } from '@/components/dashboard/DestinationComparison';
import { DestinationTrend } from '@/components/dashboard/DestinationTrend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: destinations, isLoading: destinationsLoading } = useDestinationsWithAssessments();
  const { data: aggregatedData, isLoading: aggregatedLoading } = useAggregatedPillarScores(selectedDestination);
  const { data: aggregatedIssues, isLoading: issuesLoading } = useAggregatedIssues(selectedDestination);
  const { data: recentAssessments, isLoading: recentLoading } = useRecentAssessments();
  const { data: recommendations, isLoading: recsLoading } = useTopRecommendations();

  const criticalPillar = aggregatedData?.pillarScores?.reduce((prev, current) =>
    prev.score < current.score ? prev : current
  , aggregatedData.pillarScores[0]);

  // Calculate average score if pillar scores exist
  const averageScore = aggregatedData?.pillarScores?.length 
    ? aggregatedData.pillarScores.reduce((sum, ps) => sum + ps.score, 0) / aggregatedData.pillarScores.length
    : 0;

  const selectedDestinationName = selectedDestination 
    ? destinations?.find(d => d.id === selectedDestination)?.name 
    : null;

  // Query for all destinations' pillar scores (for comparison)
  const { data: allDestinationScores } = useQuery({
    queryKey: ['all-destination-pillar-scores'],
    queryFn: async () => {
      if (!destinations || destinations.length === 0) return {};

      const scoresMap: Record<string, { pillar: 'RA' | 'OE' | 'AO'; score: number; severity: string }[]> = {};

      for (const dest of destinations) {
        const { data: assessments } = await supabase
          .from('assessments')
          .select('id')
          .eq('destination_id', dest.id)
          .eq('status', 'CALCULATED');

        if (!assessments || assessments.length === 0) continue;

        const assessmentIds = assessments.map(a => a.id);
        const { data: pillarScores } = await supabase
          .from('pillar_scores')
          .select('*')
          .in('assessment_id', assessmentIds);

        if (!pillarScores || pillarScores.length === 0) continue;

        // Average by pillar
        const pillarAggregates: Record<string, number[]> = {};
        pillarScores.forEach(ps => {
          if (!pillarAggregates[ps.pillar]) {
            pillarAggregates[ps.pillar] = [];
          }
          pillarAggregates[ps.pillar].push(ps.score);
        });

        scoresMap[dest.id] = Object.entries(pillarAggregates).map(([pillar, scores]) => ({
          pillar: pillar as 'RA' | 'OE' | 'AO',
          score: scores.reduce((a, b) => a + b, 0) / scores.length,
          severity: 'MODERADO',
        }));
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
      subtitle="Painel de controle do sistema de turismo"
    >
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard
              title="Destinos Cadastrados"
              value={stats?.totalDestinations ?? 0}
              icon={MapPin}
              variant="primary"
            />
            <StatCard
              title="Diagnósticos"
              value={stats?.activeAssessments ?? 0}
              icon={ClipboardList}
            />
            <StatCard
              title="Gargalos Críticos"
              value={stats?.criticalIssues ?? 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title="Capacitações"
              value={stats?.pendingRecommendations ?? 0}
              icon={GraduationCap}
              variant="success"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Latest Assessment */}
        <div className="xl:col-span-2 space-y-6">
          {/* Pillar Scores */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-display">
                  Radiografia do Destino
                </CardTitle>
                <CardDescription>
                  {selectedDestinationName 
                    ? `Dados de ${selectedDestinationName} (${aggregatedData?.totalAssessments ?? 0} diagnóstico(s))`
                    : aggregatedData?.totalAssessments 
                      ? `Resumo de ${aggregatedData.totalAssessments} diagnóstico(s) calculado(s)`
                      : 'Nenhum diagnóstico disponível'}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                {/* Destination Filter */}
                <Select 
                  value={selectedDestination ?? "all"} 
                  onValueChange={(value) => setSelectedDestination(value === "all" ? undefined : value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os destinos</SelectItem>
                    {destinations?.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aggregatedData?.totalAssessments && aggregatedData.totalAssessments > 0 && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/relatorios">
                        <FileText className="mr-2 h-4 w-4" />
                        Relatório
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/diagnosticos">
                        Ver diagnósticos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {aggregatedLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : aggregatedData?.pillarScores && aggregatedData.pillarScores.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {aggregatedData.pillarScores.map((pillarScore) => (
                      <PillarGauge
                        key={pillarScore.id}
                        pillar={pillarScore.pillar}
                        score={pillarScore.score}
                        severity={pillarScore.severity}
                        isCritical={criticalPillar && pillarScore.pillar === criticalPillar.pillar}
                      />
                    ))}
                  </div>
                  {/* Overall progress */}
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Índice Geral SISTUR (média)</span>
                      </div>
                      <span className="font-mono font-semibold">
                        {Math.round(averageScore * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={averageScore * 100} 
                      className="h-2"
                    />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum dado de diagnóstico disponível ainda.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-display">
                Gargalos Identificados
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/diagnosticos">
                  Ver todos
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {issuesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : aggregatedIssues && aggregatedIssues.length > 0 ? (
                <div className="space-y-3">
                  {aggregatedIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue as any} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum gargalo identificado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Destination Comparison */}
          {destinations && destinations.length >= 2 && (
            <DestinationComparison 
              destinations={destinations}
              getDestinationData={getDestinationData}
            />
          )}

          {/* Destination Trend */}
          {destinations && destinations.length > 0 && (
            <DestinationTrend destinations={destinations} />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-lg mb-2">
                Iniciar Novo Diagnóstico
              </h3>
              <p className="text-primary-foreground/80 text-sm mb-4">
                Crie uma nova rodada de avaliação para um destino turístico.
              </p>
              <Button 
                variant="secondary" 
                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link to="/diagnosticos">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Rodada
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Workflow Status */}
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

          {/* Top Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">
                Recomendações Prioritárias
              </CardTitle>
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
                <Link to="/cursos">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Ver catálogo SISTUR EDU
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
