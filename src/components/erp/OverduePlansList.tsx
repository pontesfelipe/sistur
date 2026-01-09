import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, MapPin, ExternalLink } from 'lucide-react';
import { ActionPlanWithDetails } from '@/hooks/useERPMonitoring';
import { PILLAR_INFO } from '@/types/sistur';
import { Link } from 'react-router-dom';

interface OverduePlansListProps {
  plans: ActionPlanWithDetails[] | undefined;
  isLoading: boolean;
}

export function OverduePlansList({ plans, isLoading }: OverduePlansListProps) {
  if (isLoading) {
    return (
      <Card className="border-severity-critical/30">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Card className="border-severity-good/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-severity-good">
            <AlertTriangle className="h-5 w-5" />
            Planos Atrasados
          </CardTitle>
          <CardDescription className="text-severity-good">
            Nenhum plano atrasado! Parabéns pela gestão.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-severity-critical/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-severity-critical">
          <AlertTriangle className="h-5 w-5" />
          Planos Atrasados ({plans.length})
        </CardTitle>
        <CardDescription>
          Planos que ultrapassaram a data de vencimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-4">
          <div className="space-y-3">
            {plans.map((plan) => {
              const daysOverdue = Math.abs(plan.daysUntilDue || 0);
              const pillarInfo = plan.pillar ? PILLAR_INFO[plan.pillar as keyof typeof PILLAR_INFO] : null;

              return (
                <div 
                  key={plan.id}
                  className="p-3 rounded-lg border bg-severity-critical/5 border-severity-critical/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{plan.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{plan.assessment?.destination}</span>
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysOverdue}d atraso
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {pillarInfo && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: pillarInfo.color, color: pillarInfo.color }}
                        >
                          {plan.pillar}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        P{plan.priority}
                      </Badge>
                      {plan.owner && (
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {plan.owner}
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
