import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ERPStatsCards } from '@/components/erp/ERPStatsCards';
import { PillarProgressChart } from '@/components/erp/PillarProgressChart';
import { CycleEvolutionChart } from '@/components/erp/CycleEvolutionChart';
import { OverdueProjectsList } from '@/components/erp/OverdueProjectsList';
import { RecentPlansList } from '@/components/erp/RecentPlansList';
import { ProjectsOverviewCard } from '@/components/erp/ProjectsOverviewCard';
import { 
  useERPStats, 
  usePillarProgress, 
  useCycleEvolution,
  useOverdueProjects,
  useRecentActionPlans,
  useERPRealtimeUpdates,
  useERPQueryInvalidation,
  useProjectStats
} from '@/hooks/useERPMonitoring';
import { useDestinationsWithAssessments } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, Landmark, Hotel } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type DiagnosticType = 'territorial' | 'enterprise';

export default function ERPDashboard() {
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diagnosticType, setDiagnosticType] = useState<DiagnosticType>('territorial');

  // Enable real-time updates
  useERPRealtimeUpdates();

  const { invalidateAll } = useERPQueryInvalidation();
  const { data: stats, isLoading: statsLoading } = useERPStats();
  const { data: pillarProgress, isLoading: pillarLoading } = usePillarProgress(diagnosticType);
  const { data: cycleEvolution, isLoading: cycleLoading } = useCycleEvolution(
    selectedDestination === 'all' ? undefined : selectedDestination,
    diagnosticType
  );
  const { data: overdueProjects, isLoading: overdueLoading } = useOverdueProjects();
  const { data: recentPlans, isLoading: recentLoading } = useRecentActionPlans(10);
  const { data: destinations } = useDestinationsWithAssessments();
  const { data: projectStats, isLoading: projectsLoading } = useProjectStats();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await invalidateAll();
    toast.success('Dados atualizados com sucesso!');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <AppLayout 
      title="Monitoramento ERP"
      subtitle="Dashboard de acompanhamento do ciclo Estruturação, Resultados e Processos"
      actions={
        <div className="flex items-center gap-3">
          <ToggleGroup 
            type="single" 
            value={diagnosticType} 
            onValueChange={(value) => value && setDiagnosticType(value as DiagnosticType)}
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
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Wifi className="h-3 w-3 text-severity-good animate-pulse" />
            Tempo real
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <ERPStatsCards stats={stats} isLoading={statsLoading} />

        {/* Projects Overview */}
        <ProjectsOverviewCard 
          projects={projectStats}
          isLoading={projectsLoading}
        />

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cycle Evolution */}
          <CycleEvolutionChart 
            data={cycleEvolution}
            isLoading={cycleLoading}
            destinations={destinations}
            selectedDestination={selectedDestination}
            onDestinationChange={setSelectedDestination}
          />

          {/* Pillar Progress */}
          <PillarProgressChart 
            data={pillarProgress}
            isLoading={pillarLoading}
          />
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Projects */}
          <OverdueProjectsList 
            projects={overdueProjects}
            isLoading={overdueLoading}
          />

          {/* Recent Plans */}
          <RecentPlansList 
            plans={recentPlans}
            isLoading={recentLoading}
          />
        </div>
      </div>
    </AppLayout>
  );
}
