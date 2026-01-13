import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PillarProgress } from '@/hooks/useERPMonitoring';
import { PILLAR_INFO } from '@/types/sistur';
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';

interface PillarProgressChartProps {
  data: PillarProgress[] | undefined;
  isLoading: boolean;
}

const PILLAR_COLORS: Record<string, string> = {
  RA: 'bg-pillar-ra',
  OE: 'bg-pillar-oe',
  AO: 'bg-pillar-ao',
};

export function PillarProgressChart({ data, isLoading }: PillarProgressChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progresso por Pilar</CardTitle>
          <CardDescription>Nenhum plano de ação encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progresso por Pilar</CardTitle>
        <CardDescription>
          Acompanhamento dos planos de ação organizados por pilar do SISTUR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((pillar) => {
          const completionRate = pillar.total > 0 
            ? Math.round((pillar.completed / pillar.total) * 100) 
            : 0;
          const pillarInfo = PILLAR_INFO[pillar.pillar];

          return (
            <div key={pillar.pillar} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${PILLAR_COLORS[pillar.pillar]}`}
                  />
                  <span className="font-medium">{pillarInfo?.name || pillar.pillar}</span>
                  <span className="text-xs text-muted-foreground">
                    ({pillarInfo?.fullName})
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {completionRate}%
                </span>
              </div>

              <Progress 
                value={completionRate} 
                className="h-2"
              />

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-severity-good" />
                  {pillar.completed} concluídos
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3 text-severity-moderate" />
                  {pillar.inProgress} em andamento
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <ListTodo className="h-3 w-3 text-muted-foreground" />
                  {pillar.pending} pendentes
                </Badge>
                {pillar.overdue > 0 && (
                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {pillar.overdue} atrasados
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
