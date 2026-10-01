import { tx } from '@/i18n/t';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Timer,
  FolderKanban,
  Layers
} from 'lucide-react';
import { ERPStats } from '@/hooks/useERPMonitoring';

interface ERPStatsCardsProps {
  stats: ERPStats | null | undefined;
  isLoading: boolean;
}

export function ERPStatsCards({ stats, isLoading }: ERPStatsCardsProps) {
  const cards = [
    {
      title: tx('Total de Projetos'),
      value: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      description: tx('Projetos criados'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: tx('Projetos Ativos'),
      value: stats?.activeProjects ?? 0,
      icon: Clock,
      description: tx('Em andamento'),
      color: 'text-severity-moderate',
      bgColor: 'bg-severity-moderate/10',
    },
    {
      title: tx('Conclusão de Tarefas'),
      value: `${stats?.projectCompletionRate ?? 0}%`,
      icon: TrendingUp,
      description: tx('Tarefas concluídas'),
      color: 'text-severity-good',
      bgColor: 'bg-severity-good/10',
    },
    {
      title: tx('Atrasados'),
      value: stats?.overdueCount ?? 0,
      icon: AlertTriangle,
      description: tx('Requerem atenção'),
      color: stats?.overdueCount && stats.overdueCount > 0 ? 'text-severity-critical' : 'text-muted-foreground',
      bgColor: stats?.overdueCount && stats.overdueCount > 0 ? 'bg-severity-critical/10' : 'bg-muted/50',
    },
    {
      title: tx('Diagnósticos'),
      value: stats?.totalPlans ?? 0,
      icon: ClipboardCheck,
      description: tx('Ciclos calculados'),
      color: 'text-accent-foreground',
      bgColor: 'bg-accent/20',
    },
    {
      title: tx('Tempo Médio'),
      value: stats?.avgCompletionDays !== null ? `${stats?.avgCompletionDays}d` : '--',
      icon: Timer,
      description: tx('Dias para conclusão'),
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <div className={`absolute inset-0 ${card.bgColor} opacity-50`} />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              {tx(card.title)}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tx(card.description)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
