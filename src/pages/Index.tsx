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
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  mockDashboardStats,
  mockAssessments,
  mockPillarScores,
  mockIssues,
  mockRecommendations,
} from '@/data/mockData';

const Index = () => {
  // Find the critical pillar (lowest score)
  const criticalPillar = mockPillarScores.reduce((prev, current) =>
    prev.score < current.score ? prev : current
  );

  return (
    <AppLayout 
      title="Dashboard" 
      subtitle="Visão geral do sistema de turismo"
    >
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Destinos Cadastrados"
          value={mockDashboardStats.totalDestinations}
          icon={MapPin}
          variant="primary"
        />
        <StatCard
          title="Diagnósticos Ativos"
          value={mockDashboardStats.activeAssessments}
          icon={ClipboardList}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Issues Críticos"
          value={mockDashboardStats.criticalIssues}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Recomendações"
          value={mockDashboardStats.pendingRecommendations}
          icon={GraduationCap}
          variant="success"
        />
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
                  Diagnóstico 2024 - Paraty
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/diagnosticos/a1">
                  Ver detalhes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockPillarScores.map((pillarScore) => (
                <PillarGauge
                  key={pillarScore.id}
                  pillar={pillarScore.pillar}
                  score={pillarScore.score}
                  severity={pillarScore.severity}
                  isCritical={pillarScore.pillar === criticalPillar.pillar}
                />
              ))}
            </div>
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

            <div className="space-y-3">
              {mockIssues.slice(0, 3).map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
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
            <div className="space-y-3">
              {mockAssessments.slice(0, 2).map((assessment) => (
                <AssessmentCard key={assessment.id} assessment={assessment} />
              ))}
            </div>
          </div>

          {/* Top Recommendations */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Recomendações Prioritárias
              </h2>
            </div>
            <div className="space-y-3">
              {mockRecommendations.slice(0, 2).map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
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
