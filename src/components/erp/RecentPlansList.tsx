import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ListTodo, 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  XCircle,
  MapPin,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { ActionPlanWithDetails } from '@/hooks/useERPMonitoring';
import { PILLAR_INFO } from '@/types/sistur';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentPlansListProps {
  plans: ActionPlanWithDetails[] | undefined;
  isLoading: boolean;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    icon: PlayCircle,
    variant: 'default' as const,
    color: 'text-severity-moderate',
  },
  COMPLETED: {
    label: 'Concluído',
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-severity-good',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    variant: 'outline' as const,
    color: 'text-muted-foreground',
  },
};

export function RecentPlansList({ plans, isLoading }: RecentPlansListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Planos Recentes
          </CardTitle>
          <CardDescription>
            Nenhum plano de ação encontrado
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Planos Recentes
        </CardTitle>
        <CardDescription>
          Últimos planos de ação criados no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[380px] pr-4">
          <div className="space-y-3">
            {plans.map((plan) => {
              const statusConfig = STATUS_CONFIG[plan.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusConfig.icon;
              const pillarInfo = plan.pillar ? PILLAR_INFO[plan.pillar as keyof typeof PILLAR_INFO] : null;

              return (
                <div 
                  key={plan.id}
                  className={`p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                    plan.isOverdue ? 'border-severity-critical/30 bg-severity-critical/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{plan.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{plan.assessment?.destination}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={statusConfig.variant}
                      className={`text-xs shrink-0 ${statusConfig.color}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {pillarInfo && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: pillarInfo.color, color: pillarInfo.color }}
                        >
                          {plan.pillar}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        P{plan.priority}
                      </Badge>
                      {plan.due_date && (
                        <span className={`text-xs flex items-center gap-1 ${
                          plan.isOverdue ? 'text-severity-critical' : 'text-muted-foreground'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          {format(new Date(plan.due_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link to={`/diagnosticos/${plan.assessment?.id}`}>
                        Ver <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
