import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  ClipboardList, 
  AlertTriangle, 
  GraduationCap,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  useLatestAssessment,
  useRecentAssessments,
  useTopRecommendations,
} from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: latestData, isLoading: latestLoading } = useLatestAssessment();
  const { data: recentAssessments, isLoading: recentLoading } = useRecentAssessments();
  const { data: recommendations, isLoading: recsLoading } = useTopRecommendations();

  const criticalPillar = latestData?.pillarScores?.reduce((prev, current) =>
    prev.score < current.score ? prev : current
  , latestData.pillarScores[0]);

  return (
    <AppLayout 
      title="Dashboard" 
      subtitle="Visão geral do sistema de turismo"
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
              title="Diagnósticos Ativos"
              value={stats?.activeAssessments ?? 0}
              icon={ClipboardList}
            />
            <StatCard
              title="Issues Críticos"
              value={stats?.criticalIssues ?? 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title="Recomendações"
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
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground">
                  Radiografia do Destino
                </h2>
                <p className="text-sm text-muted-foreground">
                  {latestData?.assessment 
                    ? `${latestData.assessment.title} - ${(latestData.assessment as any).destinations?.name}`
                    : 'Nenhum diagnóstico disponível'}
                </p>
              </div>
              {latestData?.assessment && (
                <Button variant="outline" asChild>
                  <Link to={`/diagnosticos/${latestData.assessment.id}`}>
                    Ver detalhes
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>

            {latestLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : latestData?.pillarScores && latestData.pillarScores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {latestData.pillarScores.map((pillarScore) => (
                  <PillarGauge
                    key={pillarScore.id}
                    pillar={pillarScore.pillar}
                    score={pillarScore.score}
                    severity={pillarScore.severity}
                    isCritical={criticalPillar && pillarScore.pillar === criticalPillar.pillar}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum dado de diagnóstico disponível ainda.
              </p>
            )}
          </div>

          {/* Issues */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Gargalos Identificados
              </h2>
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {latestLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : latestData?.issues && latestData.issues.length > 0 ? (
              <div className="space-y-3">
                {latestData.issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue as any} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum gargalo identificado.
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
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
              <Link to="/diagnosticos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Nova Rodada
              </Link>
            </Button>
          </div>

          {/* Recent Assessments */}
          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">
              Diagnósticos Recentes
            </h2>
            {recentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : recentAssessments && recentAssessments.length > 0 ? (
              <div className="space-y-3">
                {recentAssessments.map((assessment) => (
                  <AssessmentCard key={assessment.id} assessment={assessment as any} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum diagnóstico criado ainda.
              </p>
            )}
          </div>

          {/* Top Recommendations */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Recomendações Prioritárias
              </h2>
            </div>
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
                Ver todos os cursos
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
