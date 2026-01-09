import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ERPStatsCards } from '@/components/erp/ERPStatsCards';
import { PillarProgressChart } from '@/components/erp/PillarProgressChart';
import { CycleEvolutionChart } from '@/components/erp/CycleEvolutionChart';
import { OverduePlansList } from '@/components/erp/OverduePlansList';
import { RecentPlansList } from '@/components/erp/RecentPlansList';
import { 
  useERPStats, 
  usePillarProgress, 
  useCycleEvolution,
  useOverduePlans,
  useRecentActionPlans
} from '@/hooks/useERPMonitoring';
import { useDestinationsWithAssessments } from '@/hooks/useDashboardData';

export default function ERPDashboard() {
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);

  const { data: stats, isLoading: statsLoading } = useERPStats();
  const { data: pillarProgress, isLoading: pillarLoading } = usePillarProgress();
  const { data: cycleEvolution, isLoading: cycleLoading } = useCycleEvolution(
    selectedDestination === 'all' ? undefined : selectedDestination
  );
  const { data: overduePlans, isLoading: overdueLoading } = useOverduePlans();
  const { data: recentPlans, isLoading: recentLoading } = useRecentActionPlans(10);
  const { data: destinations } = useDestinationsWithAssessments();

  return (
    <AppLayout 
      title="Monitoramento ERP"
      subtitle="Dashboard de acompanhamento do ciclo Estruturação, Resultados e Processos"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <ERPStatsCards stats={stats} isLoading={statsLoading} />

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
          {/* Overdue Plans */}
          <OverduePlansList 
            plans={overduePlans}
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
