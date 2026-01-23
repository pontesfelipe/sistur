import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  ThumbsUp, 
  Percent, 
  Award,
  Hotel,
  ClipboardList,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { EnterpriseKPIs } from '@/hooks/useEnterpriseDashboardData';

interface EnterpriseKPICardsProps {
  kpis: EnterpriseKPIs | null | undefined;
  stats: {
    totalEnterprises: number;
    activeAssessments: number;
    criticalIssues: number;
    actionPlans: number;
  } | null | undefined;
  isLoading: boolean;
}

export function EnterpriseKPICards({ kpis, stats, isLoading }: EnterpriseKPICardsProps) {
  const cards = [
    {
      title: 'Empreendimentos',
      value: stats?.totalEnterprises ?? 0,
      icon: Hotel,
      description: 'Unidades cadastradas',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Diagnósticos',
      value: stats?.activeAssessments ?? 0,
      icon: ClipboardList,
      description: 'Enterprise ativos',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'RevPAR Médio',
      value: kpis?.avgRevPAR !== null ? `R$ ${kpis?.avgRevPAR?.toFixed(0) ?? 0}` : '--',
      icon: DollarSign,
      description: 'Receita por quarto disponível',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'NPS Médio',
      value: kpis?.avgNPS !== null ? kpis?.avgNPS?.toFixed(0) ?? '--' : '--',
      icon: ThumbsUp,
      description: 'Net Promoter Score',
      color: kpis?.avgNPS && kpis.avgNPS >= 50 ? 'text-severity-good' : kpis?.avgNPS && kpis.avgNPS >= 0 ? 'text-severity-moderate' : 'text-severity-critical',
      bgColor: kpis?.avgNPS && kpis.avgNPS >= 50 ? 'bg-severity-good/10' : kpis?.avgNPS && kpis.avgNPS >= 0 ? 'bg-severity-moderate/10' : 'bg-severity-critical/10',
    },
    {
      title: 'Taxa Ocupação',
      value: kpis?.avgOccupancyRate !== null ? `${kpis?.avgOccupancyRate?.toFixed(0) ?? 0}%` : '--',
      icon: Percent,
      description: 'Ocupação média',
      color: kpis?.avgOccupancyRate && kpis.avgOccupancyRate >= 70 ? 'text-severity-good' : kpis?.avgOccupancyRate && kpis.avgOccupancyRate >= 50 ? 'text-severity-moderate' : 'text-severity-critical',
      bgColor: kpis?.avgOccupancyRate && kpis.avgOccupancyRate >= 70 ? 'bg-severity-good/10' : kpis?.avgOccupancyRate && kpis.avgOccupancyRate >= 50 ? 'bg-severity-moderate/10' : 'bg-severity-critical/10',
    },
    {
      title: 'Certificações ESG',
      value: kpis?.esgCertifications ?? 0,
      icon: Award,
      description: 'Selos ambientais ativos',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Gargalos Críticos',
      value: stats?.criticalIssues ?? 0,
      icon: AlertTriangle,
      description: 'Requerem atenção',
      color: stats?.criticalIssues && stats.criticalIssues > 0 ? 'text-severity-critical' : 'text-muted-foreground',
      bgColor: stats?.criticalIssues && stats.criticalIssues > 0 ? 'bg-severity-critical/10' : 'bg-muted/50',
    },
    {
      title: 'Planos de Ação',
      value: stats?.actionPlans ?? 0,
      icon: FileCheck,
      description: 'Em execução',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2 p-3">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Skeleton className="h-7 w-14 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <div className={`absolute inset-0 ${card.bgColor} opacity-50`} />
          <CardHeader className="relative pb-1 p-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-3 pt-0">
            <div className={`text-lg font-bold ${card.color}`}>
              {card.value}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
